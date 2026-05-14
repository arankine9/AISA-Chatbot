## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farankine9%2FAISA-Chatbot&env=GOOGLE_GENERATIVE_AI_API_KEY&envDescription=Get%20one%20at%20aistudio.google.com&envLink=https%3A%2F%2Faistudio.google.com%2Fapikey)

### Steps

1. **Click the Deploy button.** Sign in to Vercel with GitHub. It will fork this repo into your GitHub.
2. **Paste your Gemini API key** when prompted. Get one at [aistudio.google.com](https://aistudio.google.com/apikey) → "Get API Key" → "Create API Key". Add it to vercel as `GOOGLE_GENERATIVE_AI_API_KEY`
3. **Click Deploy.** Wait ~90 seconds for the first build.
4. **Add a database.** On your project page, go to **Storage → Create Database → Neon** (free tier). Vercel adds `DATABASE_URL` to your project automatically and redeploys.
5. **You're live.** Visit your `*.vercel.app` URL. Click "upload docs" to drop in PDFs, text files, or markdown. Then go back and ask the bot about them.

The first time you upload a file, the app creates the `pgvector` extension and the necessary tables. No migrations to run.

## How it works

```
your question → embed → query pgvector → top 5 chunks → Gemini 2.5 Flash → streamed answer
```

- **Generation:** Gemini 2.5 Flash
- **Embeddings:** Gemini `text-embedding-004` (768 dims)
- **Vector DB:** Postgres + pgvector on Neon
- **Streaming:** Vercel AI SDK
- **Framework:** Next.js 15 (App Router)

## Customize

You have a working chatbot. Now make it yours.

### Change the system prompt
`app/api/chat/route.ts` → edit `SYSTEM_PROMPT`. This is where personality, tone, and instructions live. Tell it to be a tutor for your class, a customer support bot for your product, a Dungeon Master, whatever.

### Tune retrieval
`app/api/chat/route.ts` → change `LIMIT 5` to retrieve more or fewer chunks.
`lib/chunk.ts` → change `TARGET_SIZE` (default 1000 chars) and `OVERLAP` (default 200 chars).

### Swap the model
`app/api/chat/route.ts` → `google("gemini-2.5-flash")` → swap for `gemini-2.5-pro` for higher quality, or any other Gemini model.

### Restyle the UI
`app/page.tsx` and `app/upload/page.tsx`. CSS variables for theming live in `app/globals.css` (`--bg`, `--accent`, etc.).

## Run locally

```bash
npm install
cp .env.example .env.local
# fill in GOOGLE_GENERATIVE_AI_API_KEY and DATABASE_URL
npm run dev
```

For `DATABASE_URL` locally, easiest is to pull it from your Vercel project: `vercel env pull .env.local` after `npm i -g vercel && vercel link`.

## Cost

- **Gemini API:** Free tier is plenty for personal use and demos.
- **Neon on Vercel:** Free tier gets you 0.5 GB storage, which holds a *lot* of embedded text.
- **Vercel hosting:** Free tier covers personal projects.

You can run this thing for $0 indefinitely.
