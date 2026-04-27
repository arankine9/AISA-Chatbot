import { google } from "@ai-sdk/google";
import { streamText, type CoreMessage } from "ai";
import { buildSystemPrompt, retrieveContext } from "@/lib/rag";
import { calendarSummaryForPrompt } from "@/lib/calendar";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: CoreMessage[] };

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query =
    typeof lastUser?.content === "string"
      ? lastUser.content
      : Array.isArray(lastUser?.content)
        ? lastUser!.content
            .map((p) => ("text" in p ? p.text : ""))
            .join(" ")
        : "";

  const chunks = query ? await retrieveContext(query, 5) : [];
  const ragSystem = buildSystemPrompt(chunks);
  const calendar = calendarSummaryForPrompt();
  const system = calendar ? `${ragSystem}\n\n${calendar}` : ragSystem;

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system,
    messages,
  });

  return result.toDataStreamResponse();
}
