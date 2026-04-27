import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AISA Chatbot",
  description: "RAG chatbot powered by Gemini, pgvector, and the Vercel AI SDK.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
