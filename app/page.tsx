"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";
import { Nav } from "./components/nav";

export default function Page() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, stop } =
    useChat({ api: "/api/chat" });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <main className="mx-auto flex h-dvh max-w-3xl flex-col px-4">
      <Nav />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
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
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-900 px-4 py-2.5 text-sm text-zinc-50 shadow-sm"
                    : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200"
                }
              >
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
              </li>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <li className="mr-auto rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-3 text-zinc-500 ring-1 ring-zinc-200">
                <span className="dot" /> <span className="dot" /> <span className="dot" />
              </li>
            )}
          </ul>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="my-4 flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about the Tech Collective of Oregon…"
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"
          autoFocus
        />
        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
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
        <div className="text-base text-zinc-700">
          Welcome to the Tech Collective of Oregon
        </div>
        <p className="max-w-sm text-xs text-zinc-500">
          Ask anything about the Tech Collective of Oregon — its programs,
          people, events, and resources.
        </p>
      </div>
    </div>
  );
}
