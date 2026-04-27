"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Chatbot" },
  { href: "/calendar", label: "Calendar" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="flex items-center justify-between py-5">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/TCO.svg"
          alt="Tech Collective of Oregon"
          className="h-7 w-auto"
        />
        <div className="flex items-center gap-2 border-l border-zinc-200 pl-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px] shadow-emerald-500/50" />
          <h1 className="text-sm font-medium tracking-wide text-zinc-700">
            Tech Collective of Oregon
          </h1>
        </div>
      </div>
      <nav className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 text-xs shadow-sm">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                active
                  ? "rounded-full bg-zinc-900 px-3 py-1.5 font-medium text-white"
                  : "rounded-full px-3 py-1.5 text-zinc-600 hover:bg-zinc-100"
              }
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
