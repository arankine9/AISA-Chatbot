import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

const model = google.textEmbeddingModel("gemini-embedding-001", {
  outputDimensionality: 768,
});

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({ model, value: text });
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({ model, values: texts });
  return embeddings;
}

export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
