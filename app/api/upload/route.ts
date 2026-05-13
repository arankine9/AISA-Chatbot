import { sql, ensureSchema } from "@/lib/db";
import { chunkText } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";

export const runtime = "nodejs";
export const maxDuration = 60;

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buf);
    return parsed.text;
  }
  // txt, md, anything else: treat as plain text
  return await file.text();
}

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await extractText(file);
    if (!text.trim()) {
      return Response.json({ error: "File appears empty" }, { status: 400 });
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return Response.json({ error: "No chunks produced" }, { status: 400 });
    }

    const embeddings = await embedTexts(chunks);

    const [doc] = (await sql`
      INSERT INTO documents (filename) VALUES (${file.name}) RETURNING id
    `) as Array<{ id: number }>;

    // Insert chunks. Doing them one-by-one keeps the code simple; for big files
    // you'd batch this. Workshop scale is fine.
    for (let i = 0; i < chunks.length; i++) {
      const vec = `[${embeddings[i].join(",")}]`;
      await sql`
        INSERT INTO chunks (document_id, content, embedding)
        VALUES (${doc.id}, ${chunks[i]}, ${vec}::vector)
      `;
    }

    return Response.json({
      ok: true,
      document_id: doc.id,
      filename: file.name,
      chunks: chunks.length,
    });
  } catch (err) {
    console.error("Upload error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
