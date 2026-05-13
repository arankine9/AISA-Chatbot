// Simple recursive-ish chunker. Splits on paragraph breaks first, then falls back
// to fixed-size windows with overlap. Good enough for a workshop demo.

const TARGET_SIZE = 1000;
const OVERLAP = 200;

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  // First pass: split on double newlines (paragraphs)
  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = "";

  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length <= TARGET_SIZE) {
      buf = buf ? buf + "\n\n" + p : p;
    } else {
      if (buf) chunks.push(buf);
      // If paragraph itself is too big, window it
      if (p.length > TARGET_SIZE) {
        for (let i = 0; i < p.length; i += TARGET_SIZE - OVERLAP) {
          chunks.push(p.slice(i, i + TARGET_SIZE));
        }
        buf = "";
      } else {
        buf = p;
      }
    }
  }
  if (buf) chunks.push(buf);
  return chunks.filter((c) => c.trim().length > 0);
}
