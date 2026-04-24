# AISA Chatbot Workshop

A general-purpose RAG chatbot you can later specialize for any use case you want.

## What you're building

A chatbot that answers questions using your own documents as context. The architecture is Retrieval Augmented Generation

1. User sends a query
2. Embed the query into a vector
3. Search a vector database for the most relevant chunks of your documents
4. Pass those chunks plus the query to an LLM
5. Stream the response back to the user

## Stack

- **Next.js (App Router) on Vercel** for the app and hosting
- **Vercel Postgres with pgvector** for storing documents and their embeddings
- **Gemini 2.5 Flash** for generation (fast, cheap, free tier)
- **Gemini text-embedding-004** for embeddings (768 dimensions)
- **Vercel AI SDK** (`ai` and `@ai-sdk/google`) for streaming

Why this stack: it does lots of the work for you

## Prerequisites

- GitHub account and a fresh repo (you've done this part)
- VS Code (you've done this part)
- A Google AI Studio API key (the Gemini key you just created)
- A Vercel account

- Note: Node.js 20 or newer will let you develop this locally, but for this you can just deploy to Vercel and check what the deployment looks like. Not good long term but fine for this.

## Environment variables

Create a file called `.env.local` in your project root (that means the main folder, dont put this in some sub folder) later you will have to add these to Vercel:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here
POSTGRES_URL=your_vercel_postgres_connection_string
```

Get the Postgres URL by creating a Postgres database in your Vercel dashboard (Storage tab) and linking it to your project. Vercel will give you the connection string.

## Database setup

Run this once against your Postgres database (you can do it from the Vercel query editor or any Postgres client):

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(768) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);
```

Why:
- `VECTOR(768)` matches the output dimensions of `text-embedding-004`. If you swap embedding models, change this number.
- The HNSW index makes similarity search fast. You don't need it for small datasets but it's free to add now.
- `metadata` gives you a place to stash source URLs, chunk indices, tags, whatever.

## Project structure

Roughly what you should end up with:

```
app/
  page.tsx                 # chat UI (uses useChat from 'ai/react')
  api/
    chat/route.ts          # streaming chat endpoint with RAG
    ingest/route.ts        # add documents to the vector DB
lib/
  db.ts                    # postgres client
  embeddings.ts            # wrapper around Gemini embeddings
  rag.ts                   # query embedding + similarity search
```

## Key packages

```
npm install ai @ai-sdk/google @vercel/postgres zod
```

## How each piece works

**Ingestion endpoint (`/api/ingest`)** takes text (and optional metadata), chunks it if it's long, embeds each chunk with `text-embedding-004`, and inserts rows into `documents`. For the workshop a 500 to 1000 character chunk size with some overlap is fine.

**Chat endpoint (`/api/chat`)** receives the message history, embeds the latest user message, runs a similarity search against `documents` to get the top 4 or 5 most relevant chunks, builds a system prompt that includes those chunks as context, then calls `streamText` from the Vercel AI SDK with Gemini 2.5 Flash and returns a streaming response.

**Chat UI (`app/page.tsx`)** uses the `useChat` hook from `ai/react`, which handles sending messages, receiving the stream, and keeping message state in sync with almost no code.

## Similarity search query

This is the one bit of SQL you'll use a lot. Given a query embedding, fetch the top K most similar chunks:

```sql
SELECT content, metadata, 1 - (embedding <=> $1) AS similarity
FROM documents
ORDER BY embedding <=> $1
LIMIT 5;
```

The `<=>` operator is cosine distance. Smaller means more similar.

## checklist

Do these in order

1. Scaffold a Next.js app (`npx create-next-app@latest`), install the packages above
2. Hook up Postgres, run the schema, confirm you can connect from a route handler
3. Build the ingestion endpoint, test it by posting some text to it
4. Verify rows are landing in `documents` with non-null embeddings
5. Build the chat endpoint with RAG and streaming
6. Build the chat UI with `useChat`
7. Ingest real documents (a few wikipedia articles, a PDF, anything)
8. Ask questions and test functionality
9. Deploy to Vercel
