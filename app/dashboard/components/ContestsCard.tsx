"use client";

import { useState } from "react";
import type { RecentContest, UpcomingContest } from "@/app/lib/types/analytics";
import Card, { EmptyState } from "./ui/Card";
import { PlatformLogo, platformMeta } from "./ui/platforms";
import { Segmented } from "./ui/interaction";
import { useMounted } from "./ui/useMounted";

/** Formats a duration in minutes as e.g. "2h 30m" or "45m". */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Returns a short relative label like "in 3h", "in 2d", or "starting soon". */
function formatCountdown(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "starting soon";
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) return `in ${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `in ${diffHours}h`;
  return `in ${Math.round(diffHours / 24)}d`;
}

/** Returns a short relative label like "3h ago", "2d ago", or "just now". */
function formatElapsed(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs <= 0) return "just now";
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

type View = "upcoming" | "recent";

interface Item {
  key: string;
  platform: string;
  name: string;
  url: string;
  startTime: string;
  durationMinutes: number;
  attended?: boolean;
}

/**
 * Contests as an agenda: a date tile, name, platform and start time, then a
 * countdown (upcoming) or an Attended / Missed chip (last 7 days).
 * Dates are formatted after mount, in the viewer's timezone.
 */
export default function ContestsCard({
  upcoming,
  recent,
  attendedCount,
  total,
}: {
  upcoming?: UpcomingContest[] | null;
  recent?: RecentContest[] | null;
  attendedCount?: number;
  total?: number;
}) {
  const [view, setView] = useState<View>("upcoming");
  const mounted = useMounted();

  const rec = recent ?? [];
  const attended = attendedCount ?? rec.filter((c) => c.attended).length;
  const items: Item[] =
    view === "upcoming"
      ? (upcoming ?? []).map((c) => ({ ...c, key: `${c.platform}-${c.startTime}-${c.name}` }))
      : rec.map((c) => ({ ...c, key: c.contestId }));

  return (
    <Card
      title="Contests"
      action={
        <Segmented
          label="Contests"
          value={view}
          onChange={setView}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "recent", label: <>Last 7 days <span className="dash-num opacity-70">{attended}/{total ?? rec.length}</span></> },
          ]}
        />
      }
    >
      {items.length === 0 ? (
        view === "upcoming" ? (
          <EmptyState icon="event_upcoming" title="No upcoming contests" hint="Check back soon for the next LeetCode, Codeforces, or AtCoder round." />
        ) : (
          <EmptyState icon="history" title="No contests in the last 7 days" hint="Once LeetCode, Codeforces, or AtCoder run one, it'll show up here." />
        )
      ) : (
        <ul key={view} className="flex flex-col gap-1.5">
          {items.map((c, i) => {
            const meta = platformMeta(c.platform);
            const date = new Date(c.startTime);
            return (
              <li key={c.key} className="dash-anim-rise" style={{ animationDelay: `${i * 50}ms` }}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 p-2 -mx-2 rounded-[var(--dash-r-md)] transition-[background-color,transform] duration-[var(--dash-dur-fast)] hover:bg-[color:var(--dash-surface-sunken)] hover:translate-x-0.5"
                >
                  <span className="w-11 h-11 rounded-[var(--dash-r-md)] grid place-items-center text-center leading-none bg-[color:var(--dash-surface-sunken)] border border-[color:var(--dash-border-subtle)] group-hover:border-[color:var(--dash-accent-line)] transition-colors">
                    <span>
                      <b className="dash-num block text-[15px] text-[color:var(--dash-content-primary)]">{mounted ? date.getDate() : "·"}</b>
                      <small className="block text-[10px] mt-0.5 text-[color:var(--dash-content-tertiary)]">
                        {mounted ? date.toLocaleDateString(undefined, { weekday: "short" }) : ""}
                      </small>
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold truncate text-[color:var(--dash-content-primary)] group-hover:text-[color:var(--dash-accent-soft)] transition-colors">
                      {c.name}
                    </span>
                    <span className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[color:var(--dash-content-tertiary)]">
                      <PlatformLogo platform={c.platform} size={12} />
                      {meta.name} · {mounted ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "…"} · {formatDuration(c.durationMinutes)}
                    </span>
                  </span>
                  {view === "upcoming" ? (
                    <span className="dash-chip dash-chip-accent dash-num">{mounted ? formatCountdown(c.startTime) : "…"}</span>
                  ) : (
                    <span className="flex flex-col items-end gap-1">
                      {c.attended ? (
                        <span className="dash-chip dash-chip-good">
                          <span className="material-symbols-outlined text-[13px]" aria-hidden="true">check_circle</span>
                          Attended
                        </span>
                      ) : (
                        <span className="dash-chip dash-chip-idle">Missed</span>
                      )}
                      {mounted && <span className="dash-num text-[10px] text-[color:var(--dash-content-tertiary)]">{formatElapsed(c.startTime)}</span>}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
