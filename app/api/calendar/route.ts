import { loadEvents } from "@/lib/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const events = loadEvents();
  return Response.json({ events });
}
