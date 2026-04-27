import { sql, type DocumentRow } from "./db";
import { embedQuery, toVectorLiteral } from "./embeddings";

export type RetrievedChunk = {
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export async function retrieveContext(
  query: string,
  k = 5
): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(query);
  const vec = toVectorLiteral(embedding);

  const { rows } = await sql<DocumentRow>`
    SELECT
      content,
      metadata,
      1 - (embedding <=> ${vec}::vector) AS similarity
    FROM documents
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${k};
  `;

  return rows.map((r) => ({
    content: r.content,
    metadata: r.metadata ?? {},
    similarity: Number(r.similarity),
  }));
}

export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return [
      "You are a helpful assistant.",
      "No reference documents were retrieved for this query.",
      "Answer from general knowledge and be transparent that you do not have specific source material.",
    ].join("\n");
  }

  const context = chunks
    .map((c, i) => {
      const source =
        typeof c.metadata?.source === "string"
          ? ` (source: ${c.metadata.source})`
          : "";
      return `[#${i + 1}${source}]\n${c.content}`;
    })
    .join("\n\n---\n\n");

  return [
    "You are a helpful assistant. Answer the user's question using the context below.",
    "If the context does not contain the answer, say so plainly instead of guessing.",
    "Cite chunks inline like [#1], [#2] when you rely on them.",
    "",
    "## Context",
    context,
  ].join("\n");
}

export function chunkText(
  text: string,
  size = 800,
  overlap = 150
): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - overlap;
  }
  return chunks;
}
