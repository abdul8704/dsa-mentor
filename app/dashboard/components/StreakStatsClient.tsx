"use client";

import type { StreakData } from "@/app/lib/types/analytics";
import Last7DaysChart from "./Last7DaysChart";
import PlatformBreakdown from "./PlatformBreakdown";

interface StreakStatsClientProps {
  streak?: StreakData | null;
  /** Contests attended in the last 7 days (matched against the real schedule). */
  contestsAttended?: number;
  /** Total contests held across all platforms in the last 7 days. */
  contestsTotal?: number;
}

const DEFAULT_STREAK: StreakData = {
  currentStreak: 124,
  longestStreak: 218,
  solvedToday: 14,
  solvedTodayByPlatform: { leetcode: 9, codeforces: 3, atcoder: 0, cses: 2 },
  last7DaysSolved: 47,
  last7DaysChange: 12,
  last7DaysBreakdown: [4, 6, 8, 7, 9, 6, 7],
  last7DaysByPlatform: { leetcode: 25, codeforces: 12, atcoder: 4, cses: 6 },
  solvedThisMonth: 89,
  last30DaysByPlatform: { leetcode: 50, codeforces: 20, atcoder: 7, cses: 12 },
  solvedPrev30Days: 72,
  contestsThisWeek: 3,
};

/** Decorative flame icon using Material Symbols */
function FlameIcon() {
  return (
    <div className="relative flex-shrink-0 w-12 h-12 flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-40"
        style={{
          background: "radial-gradient(circle, color-mix(in srgb, var(--dash-accent) 60%, transparent) 0%, transparent 70%)",
        }}
      />
      <span
        className="material-symbols-outlined relative"
        style={{
          fontSize: "40px",
          color: "var(--dash-accent)",
          fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48",
          filter: "drop-shadow(0 2px 8px color-mix(in srgb, var(--dash-accent) 30%, transparent))",
        }}
      >
        local_fire_department
      </span>
    </div>
  );
}

export default function StreakStatsClient({ streak, contestsAttended, contestsTotal: contestsTotalProp }: StreakStatsClientProps) {
  const s = streak ?? DEFAULT_STREAK;
  const changeUp = s.last7DaysChange >= 0;
  // Prefer the real schedule-matched tally; fall back to the DB streak count
  // (and a sensible weekly target) when it isn't provided.
  const contestsAttendedCount = contestsAttended ?? s.contestsThisWeek;
  const contestsTotal = contestsTotalProp ?? 7;

  return (
    <div className="grid grid-cols-5 gap-3 h-full">
      {/* 1. Longest Streak — the hero tile in this group: flame icon + warm
          gradient, so it reads as the headline stat rather than one of five
          identical panels. */}
      <div
        className="col-span-2 glass-card rounded-xl px-5 py-4 flex items-center justify-center gap-4"
        style={{ background: "linear-gradient(135deg, rgba(24,24,27,0.7) 0%, rgba(30,22,18,0.6) 100%)" }}
      >
        <FlameIcon />
        <div className="flex flex-col min-w-0">
          <span
            className="tracking-widest font-medium uppercase leading-tight text-[color:var(--dash-content-tertiary)]"
            style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-caption)" }}
          >
            Longest Streak
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              className="font-bold leading-none tracking-tight text-[color:var(--dash-content-primary)]"
              style={{ fontFamily: "var(--font-geist-sans)", fontSize: "var(--dash-text-value)" }}
            >
              {s.longestStreak}
            </span>
            <span className="uppercase text-[color:var(--dash-content-tertiary)]" style={{ fontSize: "var(--dash-text-caption)" }}>days</span>
          </div>
        </div>
      </div>

      {/* 2. Last 7 Days — narrow text + wide line chart (secondary → quiet card) */}
      <div className="col-span-3 card-quiet rounded-xl px-4 py-4 flex items-stretch gap-0 overflow-hidden min-h-[9rem]">
        {/* Left ~30%: labels */}
        <div className="w-[30%] flex flex-col justify-center pr-1 border-r" style={{ borderColor: "var(--dash-border-subtle)" }}>
          <span
            className="tracking-widest font-medium uppercase leading-tight text-[color:var(--dash-content-tertiary)]"
            style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-caption)" }}
          >
            Last 7 Days
          </span>
          <span
            className="font-bold leading-none tracking-tight mt-1"
            style={{ fontFamily: "var(--font-geist-sans)", fontSize: "var(--dash-text-value)", color: "var(--dash-feedback-success)" }}
          >
            {s.last7DaysSolved}
          </span>
          <span
            className="mt-1 inline-flex items-center gap-0.5 font-semibold"
            style={{ fontSize: "var(--dash-text-tick)", color: changeUp ? "var(--dash-feedback-success)" : "var(--dash-feedback-danger)" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "0.75rem" }}>
              {changeUp ? "arrow_upward" : "arrow_downward"}
            </span>
            {Math.abs(s.last7DaysChange)}%
          </span>
          <PlatformBreakdown counts={s.last7DaysByPlatform} className="mt-1.5" />
        </div>

        {/* Right ~70%: Line chart */}
        <div className="w-[70%] pl-4 flex flex-col justify-center">
          <Last7DaysChart breakdown={s.last7DaysBreakdown} />
        </div>
      </div>

      {/* Bottom row: equal width, both secondary → quiet cards */}
      <div className="col-span-5 grid grid-cols-2 gap-3">
        {/* 3. Last 30 Days Solved */}
        <div className="card-quiet rounded-xl px-5 py-4 flex items-center justify-center gap-3.5 group h-full">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ background: "color-mix(in srgb, var(--dash-accent-soft) 8%, transparent)" }}
          >
            <span className="material-symbols-outlined text-xl" style={{ color: "var(--dash-accent-soft)" }}>
              calendar_month
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="tracking-widest font-medium uppercase leading-tight text-[color:var(--dash-content-tertiary)]"
              style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-caption)" }}
            >
              Last 30 Days
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className="font-bold leading-none tracking-tight"
                style={{ fontFamily: "var(--font-geist-sans)", fontSize: "var(--dash-text-value)", color: "var(--dash-accent-soft)" }}
              >
                {s.solvedThisMonth}
              </span>
              {/* Previous 30d count + %diff as subscript */}
              {(() => {
                const prev = s.solvedPrev30Days || 1;
                const diff = Math.round(((s.solvedThisMonth - prev) / prev) * 100);
                const up = diff >= 0;
                return (
                  <span className="flex items-center gap-0.5">
                    <span className="text-[color:var(--dash-content-tertiary)]" style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-caption)" }}>
                      {prev}
                    </span>
                    <span
                      className="inline-flex items-center gap-px font-semibold"
                      style={{ fontSize: "var(--dash-text-caption)", color: up ? "var(--dash-feedback-success)" : "var(--dash-feedback-danger)" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "10px" }}>
                        {up ? "arrow_upward" : "arrow_downward"}
                      </span>
                      {Math.abs(diff)}%
                    </span>
                  </span>
                );
              })()}
            </div>
            <PlatformBreakdown counts={s.last30DaysByPlatform} className="mt-1" />
          </div>
        </div>

        {/* 4. Contests Attended */}
        <div className="card-quiet rounded-xl px-5 py-4 flex items-center justify-center gap-3.5 group h-full">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ background: "color-mix(in srgb, var(--dash-chart-cat-5) 8%, transparent)" }}
          >
            <span className="material-symbols-outlined text-xl" style={{ color: "var(--dash-chart-cat-5)" }}>
              emoji_events
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="tracking-widest font-medium uppercase leading-tight text-[color:var(--dash-content-tertiary)]"
              style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-caption)" }}
            >
              Contests Attended
            </span>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span
                className="font-bold leading-none tracking-tight"
                style={{ fontFamily: "var(--font-geist-sans)", fontSize: "var(--dash-text-value-sm)", color: "var(--dash-chart-cat-5)" }}
              >
                {contestsAttendedCount}
              </span>
              <span
                className="font-medium text-[color:var(--dash-content-tertiary)]"
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-tick)" }}
              >
                /{contestsTotal}
              </span>
              <span className="uppercase ml-1 text-[color:var(--dash-content-tertiary)]" style={{ fontSize: "var(--dash-text-caption)" }}>last 7 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
