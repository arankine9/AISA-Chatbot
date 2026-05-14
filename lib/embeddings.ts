import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

const model = google.textEmbeddingModel("gemini-embedding-001");

// Matches the vector(768) column in the chunks table.
const providerOptions = {
  google: { outputDimensionality: 768 },
};

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model, value: text, providerOptions });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  // embedMany batches under the hood
  const { embeddings } = await embedMany({ model, values: texts, providerOptions });
  return embeddings;
}
