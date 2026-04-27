import { sql } from "@vercel/postgres";

export { sql };

export type DocumentRow = {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};
