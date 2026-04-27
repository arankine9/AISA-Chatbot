"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { Nav } from "../components/nav";

type Category =
  | "Tech Team"
  | "Capital Team"
  | "Events"
  | "Non-mandatory"
  | "General"
  | "Media Team"
  | "Exec";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  week: number;
  day: string;
  location?: string;
  description: string;
  category: Category;
  color: string;
  isHomework: boolean;
};

const LEGEND: Category[] = [
  "Tech Team",
  "Capital Team",
  "Events",
  "Media Team",
  "Exec",
  "Non-mandatory",
  "General",
];

function tint(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [viewType, setViewType] = useState<string>("dayGridMonth");

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch((e) => setError(e.message ?? "Failed to load calendar"));
  }, []);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const colorByCategory = useMemo(() => {
    const m = new Map<Category, string>();
    for (const ev of events ?? []) m.set(ev.category, ev.color);
    return m;
  }, [events]);

  const fcEvents: EventInput[] = useMemo(() => {
    const isList = viewType.startsWith("list");
    const source = events ?? [];
    return source
      .filter((ev) => !(isList && ev.date < todayStr))
      .map((ev) => {
        const isPast = ev.date < todayStr;
        const tone = isPast ? "#a1a1aa" : ev.color;
        return {
          id: ev.id,
          title: ev.title,
          start: ev.date,
          allDay: true,
          backgroundColor: tint(tone, isPast ? 0.08 : 0.15),
          borderColor: tone,
          textColor: tone,
          classNames: isPast ? ["past-event"] : undefined,
          extendedProps: { full: ev },
        };
      });
  }, [events, viewType, todayStr]);

  const onClick = (arg: EventClickArg) => {
    const full = arg.event.extendedProps.full as CalendarEvent | undefined;
    if (full) setSelected(full);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pb-10">
      <Nav />

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Spring 2026 Term Calendar
          </h2>
          <p className="text-xs text-zinc-500">
            Source:{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">
              data/spring26-calendar.xlsx
            </code>{" "}
            — edit the workbook to update the calendar and chatbot.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-600">
          {LEGEND.map((cat) => (
            <span key={cat} className="inline-flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ background: colorByCategory.get(cat) ?? "#a1a1aa" }}
              />
              {cat}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="fc-tco rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        {events === null && !error ? (
          <div className="grid h-96 place-items-center text-sm text-zinc-500">
            Loading calendar…
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, listPlugin]}
            initialView="dayGridMonth"
            initialDate="2026-04-01"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,listYear",
            }}
            buttonText={{
              today: "Today",
              month: "Month",
              listYear: "Upcoming",
            }}
            views={{
              listYear: {
                noEventsContent: "Nothing left on the schedule — see you next term.",
              },
            }}
            events={fcEvents}
            eventClick={onClick}
            datesSet={(arg: DatesSetArg) => setViewType(arg.view.type)}
            height="auto"
            eventDisplay="block"
            dayMaxEventRows={5}
            firstDay={1}
          />
        )}
      </div>

      {selected && (
        <EventModal event={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}

function EventModal({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: event.color }}
              />
              <span>{event.category}</span>
              <span className="text-zinc-300">·</span>
              <span>Week {event.week}</span>
              <span className="text-zinc-300">·</span>
              <span>
                {event.day}, {event.date}
              </span>
              {event.isHomework && (
                <>
                  <span className="text-zinc-300">·</span>
                  <span>Homework</span>
                </>
              )}
            </div>
            <div className="mt-1 text-base font-semibold text-zinc-900">
              {event.title}
            </div>
            {event.location && !event.isHomework && (
              <div className="mt-0.5 text-xs text-zinc-500">{event.location}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100"
          >
            ✕
          </button>
        </div>
        <pre className="mt-4 max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 font-sans text-sm leading-relaxed text-zinc-800">
{event.description}
        </pre>
      </div>
    </div>
  );
}
