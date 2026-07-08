"use client";

import { useEffect, useState } from "react";
import type { UpcomingContest } from "@/app/lib/types/analytics";

interface UpcomingContestsProps {
  contests?: UpcomingContest[] | null;
}

const PLATFORM_META: Record<UpcomingContest["platform"], { label: string; icon: string; color: string }> = {
  codeforces: { label: "Codeforces", icon: "public", color: "#4ecbf4" },
  leetcode: { label: "LeetCode", icon: "code", color: "#ffb700" },
  atcoder: { label: "AtCoder", icon: "terminal", color: "#4edea3" },
};

/** Formats a duration in minutes as e.g. "2h 30m" or "45m". */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Formats an ISO date like "Sat, Jul 12 · 8:00 PM" in the viewer's local time. */
function formatStartTime(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timePart = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

/** Returns a short relative label like "in 3h", "in 2d", or "starting soon". */
function formatCountdown(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "starting soon";

  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) return `in ${diffMinutes}m`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `in ${diffHours}h`;

  const diffDays = Math.round(diffHours / 24);
  return `in ${diffDays}d`;
}

export default function UpcomingContests({ contests }: UpcomingContestsProps) {
  const list = contests ?? [];

  // Locale-formatted dates and "time until" countdowns depend on the
  // viewer's locale/timezone and the current time, both of which can
  // differ between the server render and the client hydration pass.
  // Defer them to the client after mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="glass-card rounded-xl p-5 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h4
          className="text-[12px] tracking-[0.05em] font-medium uppercase text-[#dfc0b6]"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          Upcoming Contests
        </h4>
        <span className="px-2 py-0.5 bg-[rgba(244,113,68,0.1)] text-[#ffb59d] text-[10px] font-bold rounded">
          Next 7 days
        </span>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-2 py-8">
          <span className="material-symbols-outlined text-4xl text-[#a78b82]">event_available</span>
          <p className="text-sm text-[#dfc0b6]">No contests in the next 7 days</p>
          <p className="text-xs text-[#a78b82]">Check back soon — LeetCode, Codeforces, and AtCoder all post new ones often.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-white/5">
          {list.map((contest) => {
            const meta = PLATFORM_META[contest.platform];
            return (
              <li key={`${contest.platform}-${contest.name}-${contest.startTime}`} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={contest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <span
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${meta.color}1a` }}
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ color: meta.color }}>
                      {meta.icon}
                    </span>
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[#e5e1e4] truncate group-hover:text-[#ffb59d] transition-colors">
                      {contest.name}
                    </p>
                    <p className="text-[11px] text-[#a78b82] mt-0.5">
                      {meta.label} · {mounted ? formatStartTime(contest.startTime) : "…"} · {formatDuration(contest.durationMinutes)}
                    </p>
                  </div>

                  <span className="shrink-0 text-[11px] font-semibold text-[#ffb59d]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                    {mounted ? formatCountdown(contest.startTime) : ""}
                  </span>

                  <span className="material-symbols-outlined text-[16px] text-[#a78b82] group-hover:text-[#ffb59d] transition-colors">
                    open_in_new
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
