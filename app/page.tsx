"use client";

import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function ChatPage() {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || status !== "ready") return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto px-4">
      <header className="flex items-center justify-between py-4 border-b border-[var(--border)]">
        <h1 className="text-lg tracking-tight">
          chat
        </h1>
        <Link
          href="/upload"
          className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          upload docs →
        </Link>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-[var(--muted)] text-sm">
            <p>Ask anything. Upload documents on the upload page to give the bot context.</p>
            <p className="mt-2 opacity-60">Powered by Gemini 2.5 Flash + pgvector RAG.</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="space-y-1">
            <div className="text-xs text-[var(--muted)] uppercase tracking-wider">
              {m.role === "user" ? "you" : "bot"}
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">
              {m.parts.map((part, i) => {
                if (part.type === "text") return <span key={i}>{part.text}</span>;
                return null;
              })}
            </div>
          </div>
        ))}

        {status === "submitted" && (
          <div className="text-[var(--muted)] text-xs">thinking…</div>
        )}

        {error && (
          <div className="text-red-400 text-xs">error: {error.message}</div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-[var(--border)] py-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="message..."
          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--accent)] transition-colors"
          disabled={status !== "ready"}
        />
        <button
          type="submit"
          disabled={status !== "ready" || !input.trim()}
          className="px-4 py-2 bg-[var(--accent)] text-black rounded disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          send
        </button>
      </form>
    </div>
  );
}
