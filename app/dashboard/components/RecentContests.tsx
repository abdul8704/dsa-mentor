"use client";

import { useEffect, useState } from "react";
import { SiLeetcode, SiCodeforces } from "react-icons/si";
import type { IconType } from "react-icons";
import type { RecentContest } from "@/app/lib/types/analytics";

interface RecentContestsProps {
  contests?: RecentContest[] | null;
  attendedCount?: number;
  total?: number;
}

/** Simplified AtCoder monogram — no official brand SVG ships in Simple Icons, so we render a consistent "AC" glyph instead (matches RecentProblemsTable). */
const AtCoderIcon: IconType = ({ size = 24 }) => {
  const resolvedSize = typeof size === "number" ? size : parseInt(size, 10) || 24;

  return (
    <svg width={resolvedSize} height={resolvedSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor" fillOpacity="0.16" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fontFamily="var(--font-geist-mono)"
        fill="currentColor"
      >
        AC
      </text>
    </svg>
  );
};

const PLATFORM_META: Record<RecentContest["platform"], { label: string; Icon: IconType; color: string }> = {
  codeforces: { label: "Codeforces", Icon: SiCodeforces, color: "#4ecbf4" },
  leetcode: { label: "LeetCode", Icon: SiLeetcode, color: "#ffb700" },
  atcoder: { label: "AtCoder", Icon: AtCoderIcon, color: "#4edea3" },
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

/** Returns a short relative label like "3h ago", "2d ago", or "just now". */
function formatElapsed(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs <= 0) return "just now";

  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function RecentContests({ contests, attendedCount, total }: RecentContestsProps) {
  const list = contests ?? [];
  const attended = attendedCount ?? list.filter((c) => c.attended).length;
  const totalCount = total ?? list.length;

  // Locale-formatted dates depend on the viewer's timezone and the current
  // time, so defer them to the client after mount to avoid a hydration
  // mismatch (same approach as UpcomingContests).
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
          Recent Contests
        </h4>
        <span className="px-2 py-0.5 bg-[rgba(200,172,255,0.12)] text-[#c8acff] text-[10px] font-bold rounded">
          {attended}/{totalCount} attended · last 7 days
        </span>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-2 py-8">
          <span className="material-symbols-outlined text-4xl text-[#a78b82]">history</span>
          <p className="text-sm text-[#dfc0b6]">No contests in the last 7 days</p>
          <p className="text-xs text-[#a78b82]">Once LeetCode, Codeforces, or AtCoder run one, it&apos;ll show up here.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-white/5">
          {list.map((contest) => {
            const meta = PLATFORM_META[contest.platform];
            const Icon = meta.Icon;
            return (
              <li key={contest.contestId} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={contest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <span
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                  >
                    <Icon size={18} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[#e5e1e4] truncate group-hover:text-[#ffb59d] transition-colors">
                      {contest.name}
                    </p>
                    <p className="text-[11px] text-[#a78b82] mt-0.5">
                      {meta.label} · {mounted ? formatStartTime(contest.startTime) : "…"} · {formatDuration(contest.durationMinutes)}
                    </p>
                  </div>

                  {mounted && (
                    <span className="hidden sm:inline shrink-0 text-[11px] text-[#a78b82]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                      {formatElapsed(contest.startTime)}
                    </span>
                  )}

                  {contest.attended ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(78,222,163,0.12)] text-[#4edea3]">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      Attended
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/4 text-[#a78b82]">
                      <span className="material-symbols-outlined text-[13px]">radio_button_unchecked</span>
                      Missed
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
