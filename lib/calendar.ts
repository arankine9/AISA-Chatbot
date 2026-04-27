import fs from "node:fs";
import path from "node:path";

const YEAR = 2026;
const CSV_PATH = path.join(process.cwd(), "data", "spring26-calendar.csv");

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const DAY_COLUMNS = [
  { idx: 2, name: "Monday", offset: 0, location: "Dream Lab" },
  { idx: 3, name: "Tuesday", offset: 1, location: "Willow Room" },
  { idx: 4, name: "Wednesday", offset: 2, location: "Lillis 132 (General Meeting, 6–7pm)" },
  { idx: 5, name: "Thursday", offset: 3, location: "Dream Lab" },
  { idx: 6, name: "Friday", offset: 4, location: "Lillis ENTR (Exec only)" },
] as const;

const HOMEWORK_COL = 7;

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  week: number;
  day: string; // "Monday"...
  location?: string;
  description: string;
  category: "day" | "homework";
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += c;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function parseStartDate(rangeText: string): Date | null {
  // Tolerant of any separator; just grab the first "Mon DD" occurrence.
  const m = rangeText.match(/([A-Za-z]{3})\s+(\d{1,2})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  const day = parseInt(m[2], 10);
  if (month === undefined || Number.isNaN(day)) return null;
  return new Date(Date.UTC(YEAR, month, day));
}

function fmtDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

function cleanCell(s: string | undefined): string {
  if (!s) return "";
  return s.replace(/\r/g, "").trim();
}

function firstLine(s: string): string {
  const line = s.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  // Trim leading bullet markers.
  return line.replace(/^[•\-*?•]\s*/, "").trim();
}

// Excel exports CSVs in Windows-1252. Read raw bytes and translate the
// punctuation characters that actually show up in this file.
const WIN1252_FIXUPS: Record<number, string> = {
  0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡",
  0x88: "ˆ", 0x89: "‰", 0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž",
  0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–",
  0x97: "—", 0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ",
  0x9e: "ž", 0x9f: "Ÿ",
};

function readCsv(): string {
  const buf = fs.readFileSync(CSV_PATH);
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if (b in WIN1252_FIXUPS) {
      out += WIN1252_FIXUPS[b];
    } else {
      out += String.fromCharCode(b);
    }
  }
  return out;
}

let cached: { mtimeMs: number; events: CalendarEvent[] } | null = null;

export function loadEvents(): CalendarEvent[] {
  const stat = fs.statSync(CSV_PATH);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.events;

  const rows = parseCsv(readCsv());
  const events: CalendarEvent[] = [];

  for (const row of rows) {
    const dateText = cleanCell(row[0]);
    const start = parseStartDate(dateText);
    if (!start) continue;

    const weekStr = cleanCell(row[1]);
    const week = parseInt(weekStr, 10);
    if (Number.isNaN(week)) continue;

    for (const col of DAY_COLUMNS) {
      const content = cleanCell(row[col.idx]);
      if (!content) continue;
      const date = addDays(start, col.offset);
      const title = firstLine(content);
      events.push({
        id: `w${week}-${col.name.toLowerCase()}`,
        title: title || `${col.name} — Week ${week}`,
        date: fmtDate(date),
        week,
        day: col.name,
        location: col.location,
        description: content,
        category: "day",
      });
    }

    const homework = cleanCell(row[HOMEWORK_COL]);
    if (homework) {
      const friday = addDays(start, 4);
      events.push({
        id: `w${week}-homework`,
        title: `Week ${week} — Homework & Deadlines`,
        date: fmtDate(friday),
        week,
        day: "Friday",
        description: homework,
        category: "homework",
      });
    }
  }

  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  cached = { mtimeMs: stat.mtimeMs, events };
  return events;
}

export function calendarSummaryForPrompt(): string {
  let events: CalendarEvent[];
  try {
    events = loadEvents();
  } catch {
    return "";
  }
  if (events.length === 0) return "";

  const byWeek = new Map<number, CalendarEvent[]>();
  for (const ev of events) {
    if (!byWeek.has(ev.week)) byWeek.set(ev.week, []);
    byWeek.get(ev.week)!.push(ev);
  }

  const blocks: string[] = [];
  for (const week of [...byWeek.keys()].sort((a, b) => a - b)) {
    const weekEvents = byWeek.get(week)!;
    const lines = weekEvents.map((ev) => {
      const loc = ev.location ? ` @ ${ev.location}` : "";
      const body = ev.description.replace(/\n+/g, " | ");
      return `- ${ev.date} (${ev.day})${loc}: ${body}`;
    });
    blocks.push(`Week ${week}:\n${lines.join("\n")}`);
  }

  return [
    "## Tech Collective of Oregon — Spring 2026 Term Calendar",
    "(Auto-generated from data/spring26-calendar.csv. Use this as the authoritative schedule.)",
    "",
    blocks.join("\n\n"),
  ].join("\n");
}
