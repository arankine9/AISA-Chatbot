"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";

export default function Page() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, stop } =
    useChat({ api: "/api/chat" });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <main className="mx-auto flex h-dvh max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px] shadow-emerald-400/60" />
          <h1 className="text-sm font-medium tracking-wide text-zinc-200">
            AISA Chatbot
          </h1>
        </div>
        <span className="text-xs text-zinc-500">Gemini · pgvector · RAG</span>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 shadow-inner"
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => (
              <li
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-100 px-4 py-2.5 text-sm text-zinc-900 shadow"
                    : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 ring-1 ring-zinc-800"
                }
              >
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
              </li>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <li className="mr-auto rounded-2xl rounded-bl-sm bg-zinc-900 px-4 py-3 text-zinc-400 ring-1 ring-zinc-800">
                <span className="dot" /> <span className="dot" /> <span className="dot" />
              </li>
            )}
          </ul>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-900/60 bg-red-950/50 px-3 py-2 text-xs text-red-300">
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="my-4 flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask anything about your documents…"
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          autoFocus
        />
        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-xl bg-zinc-100 px-4 text-sm font-medium text-zinc-900 disabled:opacity-40"
          >
            Send
          </button>
        )}
      </form>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="grid h-full place-items-center text-center">
      <div className="space-y-2">
        <div className="text-base text-zinc-300">Start a conversation</div>
        <p className="max-w-sm text-xs text-zinc-500">
          Ingest documents via <code className="rounded bg-zinc-800 px-1 py-0.5">POST /api/ingest</code>{" "}
          then ask grounded questions here.
        </p>
      </div>
    </div>
  );
}
