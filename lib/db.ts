import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Add Neon integration in Vercel.");
}

export const sql = neon(process.env.DATABASE_URL!);

// Ensure pgvector + tables exist. Cheap to call repeatedly (IF NOT EXISTS).
let initialized = false;
export async function ensureSchema() {
  if (initialized) return;
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS chunks (
      id BIGSERIAL PRIMARY KEY,
      document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      embedding vector(768)
    )
  `;
  // IVFFlat index for faster similarity search (optional, helps once you have many chunks)
  await sql`
    CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `;
  initialized = true;
}
