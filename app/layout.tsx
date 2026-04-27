import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tech Collective of Oregon",
  description: "AI assistant for the Tech Collective of Oregon.",
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
