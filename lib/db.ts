import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;
function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add Neon integration in Vercel.");
  }
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

export const sql: NeonQueryFunction<false, false> = new Proxy(
  function () {} as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, thisArg, args) {
      return Reflect.apply(getSql() as unknown as Function, thisArg, args);
    },
    get(_target, prop, receiver) {
      return Reflect.get(getSql() as unknown as object, prop, receiver);
    },
  }
);

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
