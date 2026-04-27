import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

const YEAR = 2026;
const XLSX_PATH = path.join(process.cwd(), "data", "spring26-calendar.xlsx");

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const DAY_COLUMNS = [
  { col: 3, name: "Monday", offset: 0, location: "Dream Lab" },
  { col: 4, name: "Tuesday", offset: 1, location: "Willow Room" },
  { col: 5, name: "Wednesday", offset: 2, location: "Lillis 132 (General Meeting, 6–7pm)" },
  { col: 6, name: "Thursday", offset: 3, location: "Dream Lab" },
  { col: 7, name: "Friday", offset: 4, location: "Lillis ENTR (Exec only)" },
] as const;

const HOMEWORK_COL = 8;

export type Category =
  | "Tech Team"
  | "Capital Team"
  | "Events"
  | "Non-mandatory"
  | "General"
  | "Media Team"
  | "Exec";

export const CATEGORY_COLORS: Record<Category, string> = {
  "Tech Team": "#4F81BD",
  "Capital Team": "#9BBB59",
  "Events": "#F79646",
  "Non-mandatory": "#808080",
  "General": "#18181B",
  "Media Team": "#8064A2",
  "Exec": "#C0504D",
};

// ARGB strings as exported by Excel → category in the term legend.
const ARGB_TO_CATEGORY: Record<string, Category> = {
  FF4F81BD: "Tech Team",
  FF538DD5: "Tech Team",
  FF9BBB59: "Capital Team",
  FFF79646: "Events",
  FF808080: "Non-mandatory",
  FF000000: "General",
  FF1A1A2E: "General",
  FF8064A2: "Media Team",
  FFC0504D: "Exec",
};

function categoryFromArgb(argb: string | undefined | null): Category {
  if (!argb) return "General";
  return ARGB_TO_CATEGORY[argb.toUpperCase()] ?? "General";
}

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  week: number;
  day: string;
  location?: string;
  description: string;
  category: Category;
  color: string;
  isHomework: boolean;
};

function parseStartDate(s: unknown): Date | null {
  if (!s) return null;
  const text = typeof s === "string" ? s : String(s);
  const m = text.match(/([A-Za-z]{3})\s+(\d{1,2})/);
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

type ColoredChunk = { text: string; category: Category };

// Walk a cell's content and emit chunks of contiguous-same-category text.
function chunksFromCell(cell: ExcelJS.Cell): ColoredChunk[] {
  const value = cell.value;
  if (value == null) return [];

  let runs: { text: string; argb: string | undefined }[];
  if (typeof value === "object" && "richText" in value) {
    runs = (value as ExcelJS.CellRichTextValue).richText.map((rt) => ({
      text: rt.text,
      argb: rt.font?.color?.argb,
    }));
  } else {
    const text = typeof value === "string" ? value : String(value);
    if (!text.trim()) return [];
    runs = [{ text, argb: cell.font?.color?.argb }];
  }

  const chunks: ColoredChunk[] = [];
  let buf = "";
  let bufCat: Category | null = null;

  const flush = () => {
    const t = buf.trim();
    // Skip chunks that are pure decoration (bullets, dashes, whitespace).
    const meaningful = t.replace(/[•\-*\s]+/g, "");
    if (t && meaningful && bufCat) chunks.push({ text: t, category: bufCat });
    buf = "";
    bufCat = null;
  };

  for (const run of runs) {
    const cat = categoryFromArgb(run.argb);
    if (bufCat === null || cat === bufCat) {
      buf += run.text;
      bufCat = cat;
    } else {
      flush();
      buf = run.text;
      bufCat = cat;
    }
  }
  flush();
  return chunks;
}

let cached: { mtimeMs: number; events: CalendarEvent[] } | null = null;

export async function loadEvents(): Promise<CalendarEvent[]> {
  const stat = fs.statSync(XLSX_PATH);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.events;

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const ws = wb.worksheets[0];

  const events: CalendarEvent[] = [];

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const dateCell = row.getCell(1).value;
    const start = parseStartDate(dateCell);
    if (!start) continue;

    const weekVal = row.getCell(2).value;
    const week =
      typeof weekVal === "number"
        ? weekVal
        : typeof weekVal === "string"
          ? parseInt(weekVal, 10)
          : NaN;
    if (Number.isNaN(week)) continue;

    for (const dc of DAY_COLUMNS) {
      const cell = row.getCell(dc.col);
      const chunks = chunksFromCell(cell);
      const date = addDays(start, dc.offset);
      const dateStr = fmtDate(date);
      chunks.forEach((chunk, i) => {
        const title = firstLine(chunk.text);
        events.push({
          id: `w${week}-${dc.name.toLowerCase()}-${i}`,
          title: title || `${dc.name} — ${chunk.category}`,
          date: dateStr,
          week,
          day: dc.name,
          location: dc.location,
          description: chunk.text,
          category: chunk.category,
          color: CATEGORY_COLORS[chunk.category],
          isHomework: false,
        });
      });
    }

    const homeworkChunks = chunksFromCell(row.getCell(HOMEWORK_COL));
    homeworkChunks.forEach((chunk, i) => {
      const friday = addDays(start, 4);
      const title = firstLine(chunk.text);
      events.push({
        id: `w${week}-homework-${i}`,
        title: title || `Week ${week} — ${chunk.category}`,
        date: fmtDate(friday),
        week,
        day: "Friday",
        description: chunk.text,
        category: chunk.category,
        color: CATEGORY_COLORS[chunk.category],
        isHomework: true,
      });
    });
  }

  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  cached = { mtimeMs: stat.mtimeMs, events };
  return events;
}

function firstLine(s: string): string {
  const line = s
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? "";
  return line.replace(/^[•\-*?]\s*/, "").trim();
}

export async function calendarSummaryForPrompt(): Promise<string> {
  let events: CalendarEvent[];
  try {
    events = await loadEvents();
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
      const tag = ev.isHomework ? "Homework" : ev.category;
      const body = ev.description.replace(/\n+/g, " | ");
      return `- ${ev.date} (${ev.day}) [${tag}]${loc}: ${body}`;
    });
    blocks.push(`Week ${week}:\n${lines.join("\n")}`);
  }

  return [
    "## Tech Collective of Oregon — Spring 2026 Term Calendar",
    "(Auto-generated from data/spring26-calendar.xlsx. Categories follow the term legend: Tech Team, Capital Team, Events, Non-mandatory, General, Media Team, Exec.)",
    "",
    blocks.join("\n\n"),
  ].join("\n");
}
