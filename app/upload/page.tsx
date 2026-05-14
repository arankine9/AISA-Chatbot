"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Doc = {
  id: number;
  filename: string;
  created_at: string;
  chunk_count: number;
};

export default function UploadPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocs(data.documents || []);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function uploadFile(file: File) {
    setUploading(true);
    setStatus(`uploading ${file.name}…`);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setStatus(`✓ added ${data.chunks} chunks from ${data.filename}`);
      await refresh();
    } catch (e) {
      setStatus(`error: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      await uploadFile(f);
    }
  }

  async function deleteDoc(id: number) {
    if (!confirm("Delete this document and all its chunks?")) return;
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refresh();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <h1 className="text-lg tracking-tight">
          upload
        </h1>
        <Link
          href="/"
          className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          ← back to chat
        </Link>
      </header>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-[var(--accent)] bg-[var(--surface)]"
            : "border-[var(--border)] hover:border-[var(--muted)]"
        }`}
      >
        <input
          type="file"
          className="hidden"
          accept=".txt,.md,.pdf"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />
        <div className="text-sm">
          {uploading ? "uploading…" : "drop files here or click to select"}
        </div>
        <div className="text-xs text-[var(--muted)] mt-1">.txt, .md, .pdf</div>
      </label>

      {status && (
        <div className="text-xs text-[var(--muted)]">{status}</div>
      )}

      <div>
        <h2 className="text-xs uppercase tracking-wider text-[var(--muted)] mb-3">
          knowledge base ({docs.length})
        </h2>
        {docs.length === 0 ? (
          <div className="text-xs text-[var(--muted)]">no documents yet</div>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2"
              >
                <div>
                  <div className="text-sm">{d.filename}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {d.chunk_count} chunks · {new Date(d.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => deleteDoc(d.id)}
                  className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors"
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
