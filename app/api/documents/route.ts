import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSchema();
    const docs = (await sql`
      SELECT d.id, d.filename, d.created_at, COUNT(c.id)::int AS chunk_count
      FROM documents d
      LEFT JOIN chunks c ON c.document_id = d.id
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `) as Array<{ id: number; filename: string; created_at: string; chunk_count: number }>;
    return Response.json({ documents: docs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureSchema();
    const { id } = await req.json();
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    await sql`DELETE FROM documents WHERE id = ${id}`;
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
