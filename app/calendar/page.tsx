"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import { Nav } from "../components/nav";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  week: number;
  day: string;
  location?: string;
  description: string;
  category: "day" | "homework";
};

const CATEGORY_COLORS: Record<CalendarEvent["category"], { bg: string; border: string; text: string }> = {
  day: { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a8a" },
  homework: { bg: "#fee2e2", border: "#ef4444", text: "#7f1d1d" },
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch((e) => setError(e.message ?? "Failed to load calendar"));
  }, []);

  const fcEvents: EventInput[] = useMemo(
    () =>
      (events ?? []).map((ev) => ({
        id: ev.id,
        title: ev.title,
        start: ev.date,
        allDay: true,
        backgroundColor: CATEGORY_COLORS[ev.category].bg,
        borderColor: CATEGORY_COLORS[ev.category].border,
        textColor: CATEGORY_COLORS[ev.category].text,
        extendedProps: { full: ev },
      })),
    [events]
  );

  const onClick = (arg: EventClickArg) => {
    const full = arg.event.extendedProps.full as CalendarEvent | undefined;
    if (full) setSelected(full);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pb-10">
      <Nav />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Spring 2026 Term Calendar
          </h2>
          <p className="text-xs text-zinc-500">
            Source: <code className="rounded bg-zinc-100 px-1 py-0.5">data/spring26-calendar.csv</code>
            {" "}— edit the CSV to update both the calendar and the chatbot.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-600">
          <Legend swatch={CATEGORY_COLORS.day.border} label="Meeting / Workshop" />
          <Legend swatch={CATEGORY_COLORS.homework.border} label="Homework & Deadlines" />
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm fc-tco">
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
              right: "dayGridMonth,listMonth",
            }}
            buttonText={{
              today: "Today",
              month: "Month",
              list: "Agenda",
            }}
            events={fcEvents}
            eventClick={onClick}
            height="auto"
            eventDisplay="block"
            dayMaxEventRows={4}
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

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-sm" style={{ background: swatch }} />
      {label}
    </span>
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
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Week {event.week} · {event.day} · {event.date}
            </div>
            <div className="mt-1 text-base font-semibold text-zinc-900">
              {event.title}
            </div>
            {event.location && (
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
