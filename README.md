# AISA Chatbot

A Retrieval Augmented Generation (RAG) chatbot built on Next.js, Vercel Postgres + pgvector, the Vercel AI SDK, and Gemini.

- **Generation:** `gemini-2.5-flash`
- **Embeddings:** `text-embedding-004` (768-dim)
- **Vector store:** Postgres with `pgvector` (HNSW + cosine)
- **Streaming UI:** `useChat` from the Vercel AI SDK

## Project layout

```
app/
  page.tsx                # chat UI (useChat)
  layout.tsx
  globals.css
  api/
    chat/route.ts         # streaming RAG endpoint
    ingest/route.ts       # ingest documents (chunk + embed + insert)
lib/
  db.ts                   # @vercel/postgres client
  embeddings.ts           # Gemini embeddings wrapper
  rag.ts                  # retrieval, chunking, prompt assembly
db/
  schema.sql              # pgvector + documents table
```

## 1. Environment

Create `.env.local` in the project root:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here
POSTGRES_URL=your_vercel_postgres_connection_string
```

In Vercel, add the same two variables under **Settings → Environment Variables**.

## 2. Database

In your Vercel dashboard, create a Postgres database under **Storage**, link it to the project, then run `db/schema.sql` once (Vercel's "Query" tab works). It enables `pgvector`, creates the `documents` table, and adds an HNSW index.

## 3. Install + run

```bash
npm install
npm run dev
```

If you skipped Node locally (Path A from the workshop), just push to GitHub — Vercel will install and deploy on every commit.

## 4. Ingest documents

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H 'content-type: application/json' \
  -d '{
    "text": "Your long document text goes here...",
    "metadata": { "source": "my-doc.txt" }
  }'
```

The endpoint chunks the input (default ~800 chars with 150 overlap), embeds each chunk, and inserts rows into `documents`. `GET /api/ingest` returns the row count for a quick sanity check.

## 5. Chat

Open the app and ask questions. The chat route embeds the latest user message, retrieves the top 5 chunks via cosine distance, builds a system prompt with that context, and streams Gemini's reply through the AI SDK.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project → import the repo**.
3. Attach a Postgres store under **Storage** and link it (this auto-populates `POSTGRES_URL`).
4. Add `GOOGLE_GENERATIVE_AI_API_KEY` under **Environment Variables**.
5. Run `db/schema.sql` once against the database.
6. Deploy.

## Notes

- If you swap embedding models, change `VECTOR(768)` in `db/schema.sql` to match the new dimension.
- `app/api/chat/route.ts` and `app/api/ingest/route.ts` use the Node.js runtime because `@vercel/postgres` needs it.
- Tweak chunk size / overlap with `chunkSize` and `chunkOverlap` in the ingest body.
