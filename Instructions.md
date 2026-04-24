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
- A Google AI Studio API key (you've done this part)
- A Vercel account (as easy as the other ones. ask your favorite AI how to connect your github repo that you already made to this. it should be like 3 buttons)

### Now you have 2 options

**A : deploy-to-test.** This is the easiest since you dont have to install Node.js but will be more annoying to test. Skip installing Node entirely. Scaffold your app and let Vercel auto-deploy every time you push. You'll iterate by editing code, pushing to GitHub, and hitting your Vercel preview URL. Slower feedback loop but zero local setup.

**B: local dev.** Install Node.js 20 or newer from nodejs.org, then you can run everything on your machine with hot reload. Better long term but not required today.

Pick one the rest of this guide works for both, with notes where the steps differ.

## Environment variables

Create a file called `.env.local` in your project root (that means the main folder, dont put this in some sub folder) later you will have to add these to Vercel:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here
POSTGRES_URL=your_vercel_postgres_connection_string
```

Get the Postgres URL by creating a Postgres database in your Vercel dashboard (Storage tab) and linking it to your project. Vercel will give you the connection string.

If you're on Path A, you'll also need to add these same variables to your Vercel project under Settings → Environment Variables. That's what the deployed app actually reads.

## Database setup

This part is probably the most confusing, but pretty much all AI tools will know how to do this.

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

On Path A you won't run this locally. Instead, edit `package.json` to add these to `dependencies` and Vercel will install them on the next deploy. Or use github.dev (press `.` on your repo page) which gives you a browser-based terminal where `npm install` works.

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

1. Scaffold a Next.js app. Path B: run `npx create-next-app@latest` locally. Path A: use a Next.js template from the Vercel dashboard (New Project → Browse Templates → Next.js), or open your repo in github.dev and run the same command there. Either way, install the packages listed above.
2. Hook up Postgres and run the schema against your database. Path B: verify the connection by hitting a route handler on localhost. Path A: push your code, wait for the deploy, and hit the route on your Vercel URL.
3. Build the ingestion endpoint, test it by posting some text to it
4. Verify rows are landing in `documents` with non-null embeddings
5. Build the chat endpoint with RAG and streaming
6. Build the chat UI with `useChat`
7. Ingest real documents (a few wikipedia articles, a PDF, anything)
8. Ask questions and test functionality
9. Deploy to Vercel (Path B only, Path A is already deployed)
10. Make it look cool and send the link
