import { z } from "zod";
import { sql } from "@/lib/db";
import { embedBatch, toVectorLiteral } from "@/lib/embeddings";
import { chunkText } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  text: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  chunkSize: z.number().int().positive().max(4000).optional(),
  chunkOverlap: z.number().int().nonnegative().max(1000).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { text, metadata = {}, chunkSize, chunkOverlap } = parsed.data;
  const chunks = chunkText(text, chunkSize, chunkOverlap);
  const embeddings = await embedBatch(chunks);

  const inserted: number[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const meta = { ...metadata, chunk_index: i, chunk_count: chunks.length };
    const vec = toVectorLiteral(embeddings[i]);
    const { rows } = await sql<{ id: number }>`
      INSERT INTO documents (content, embedding, metadata)
      VALUES (${chunks[i]}, ${vec}::vector, ${JSON.stringify(meta)}::jsonb)
      RETURNING id;
    `;
    inserted.push(rows[0].id);
  }

  return Response.json({ ok: true, inserted: inserted.length, ids: inserted });
}

export async function GET() {
  const { rows } = await sql<{ count: number }>`SELECT COUNT(*)::int AS count FROM documents;`;
  return Response.json({ count: rows[0]?.count ?? 0 });
}
