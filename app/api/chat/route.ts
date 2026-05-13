import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { sql, ensureSchema } from "@/lib/db";
import { embedText } from "@/lib/embeddings";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a helpful assistant. Answer the user's questions clearly and directly.

When CONTEXT is provided below, use it to ground your answers. If the context doesn't contain the answer, say so honestly rather than making things up. Mention which source you used when relevant.

If no context is provided, answer from general knowledge but be transparent about it.`;

function getUserText(msg: UIMessage): string {
  if (!msg.parts) return "";
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const { messages }: { messages: UIMessage[] } = await req.json();

    // Pull the latest user message text to retrieve context
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    let context = "";
    if (lastUser) {
      const queryText = getUserText(lastUser).trim();
      if (queryText) {
        const queryEmbedding = await embedText(queryText);
        const vectorLiteral = `[${queryEmbedding.join(",")}]`;
        const rows = (await sql`
          SELECT c.content, d.filename
          FROM chunks c
          JOIN documents d ON d.id = c.document_id
          ORDER BY c.embedding <=> ${vectorLiteral}::vector
          LIMIT 5
        `) as Array<{ content: string; filename: string }>;

        if (rows.length > 0) {
          context = rows
            .map((r, i) => `[Source ${i + 1}: ${r.filename}]\n${r.content}`)
            .join("\n\n---\n\n");
        }
      }
    }

    const system = context
      ? `${SYSTEM_PROMPT}\n\nCONTEXT:\n${context}`
      : SYSTEM_PROMPT;

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("Chat error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
