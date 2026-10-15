"use client";

import type { RecentContest, StreakData } from "@/app/lib/types/analytics";
import Card, { Delta } from "./ui/Card";
import CountUp from "./ui/CountUp";
import PlatformSplit from "./ui/PlatformSplit";
import { PlatformLogo, platformMeta } from "./ui/platforms";
import { useChartTip } from "./ui/interaction";

interface StreakStatsClientProps {
  streak?: StreakData | null;
  /** Contests attended in the last 7 days (matched against the real schedule). */
  contestsAttended?: number;
  /** Total contests held across all platforms in the last 7 days. */
  contestsTotal?: number;
  /** The contests behind that tally, drawn as one pip each. */
  contests?: RecentContest[];
}

const DEFAULT_STREAK: StreakData = {
  currentStreak: 124,
  longestStreak: 218,
  solvedToday: 14,
  solvedTodayByPlatform: { leetcode: 9, codeforces: 3, atcoder: 0, cses: 2 },
  last7DaysSolved: 47,
  last7DaysChange: 12,
  last7DaysBreakdown: [4, 6, 8, 7, 9, 6, 7],
  last7DaysBreakdownByPlatform: [],
  last7DaysByPlatform: { leetcode: 25, codeforces: 12, atcoder: 4, cses: 6 },
  solvedThisMonth: 89,
  last30DaysByPlatform: { leetcode: 50, codeforces: 20, atcoder: 7, cses: 12 },
  solvedPrev30Days: 72,
  contestsThisWeek: 3,
};

function BigNumber({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="dash-num dash-hero-num">
        <CountUp value={value} />
      </span>
      <span className="text-[13px] text-[color:var(--dash-content-tertiary)]">{unit}</span>
    </div>
  );
}

/**
 * The four KPI tiles under the profile strip: current streak against the
 * longest, solved today, last 30 days vs the 30 before, and contests attended
 * in the last 7 days. `contestsAttended` undefined hides the contests tile
 * (public profiles that don't share contests).
 */
export default function StreakStatsClient({ streak, contestsAttended, contestsTotal: contestsTotalProp, contests }: StreakStatsClientProps) {
  const s = streak ?? DEFAULT_STREAK;
  const tip = useChartTip();
  const showContests = contestsAttended !== undefined;
  // Prefer the real schedule-matched tally; fall back to the DB streak count
  // (and a sensible weekly target) when it isn't provided.
  const contestsAttendedCount = contestsAttended ?? s.contestsThisWeek;
  const contestsTotal = contestsTotalProp ?? 7;

  const longest = Math.max(s.longestStreak, s.currentStreak);
  const streakPct = longest > 0 ? (s.currentStreak / longest) * 100 : 0;
  const toBeat = longest - s.currentStreak;

  const prev30 = s.solvedPrev30Days || 1;
  const diff30 = Math.round(((s.solvedThisMonth - prev30) / prev30) * 100);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${showContests ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
      <Card title={<span className="dash-label">Current streak</span>}>
        <BigNumber value={s.currentStreak} unit={s.currentStreak === 1 ? "day" : "days"} />
        <div
          className="dash-meter"
          role="img"
          aria-label={`${s.currentStreak} of ${longest} days, your longest streak`}
        >
          <i className="dash-anim-grow-x" style={{ width: `${streakPct}%` }} />
        </div>
        <div className="flex justify-between gap-2 text-xs text-[color:var(--dash-content-secondary)]">
          <span>
            Longest <b className="dash-num text-[color:var(--dash-content-primary)]">{longest}</b> days
          </span>
          <span className="text-[color:var(--dash-content-tertiary)]">
            {toBeat === 0 ? (s.currentStreak > 0 ? "Personal best" : "Start today") : `${toBeat} to beat it`}
          </span>
        </div>
      </Card>

      <Card title={<span className="dash-label">Solved today</span>}>
        <BigNumber value={s.solvedToday} unit={s.solvedToday === 1 ? "problem" : "problems"} />
        <PlatformSplit counts={s.solvedTodayByPlatform} />
      </Card>

      <Card title={<span className="dash-label">Last 30 days</span>} action={<Delta value={diff30} suffix="%" />}>
        <BigNumber value={s.solvedThisMonth} unit={`vs ${s.solvedPrev30Days} before`} />
        <PlatformSplit counts={s.last30DaysByPlatform} />
      </Card>

      {showContests && (
        <Card title={<span className="dash-label">Contests · last 7 days</span>}>
          <BigNumber value={contestsAttendedCount} unit={`of ${contestsTotal} attended`} />
          {contests && contests.length > 0 ? (
            <>
              <ul className="flex flex-wrap gap-1.5" aria-label="Contests held in the last 7 days">
                {contests.map((c, i) => {
                  const meta = platformMeta(c.platform);
                  const label = `${c.name} · ${c.attended ? "attended" : "missed"}`;
                  return (
                    <li
                      key={c.contestId}
                      tabIndex={0}
                      aria-label={label}
                      className="dash-anim-pop w-7 h-7 grid place-items-center rounded-[var(--dash-r-sm)] border transition-transform duration-[var(--dash-dur-fast)] hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
                      style={{
                        animationDelay: `${i * 60}ms`,
                        background: c.attended ? "var(--dash-accent-wash)" : "var(--dash-surface-sunken)",
                        borderColor: c.attended ? "var(--dash-accent-line)" : "var(--dash-border-subtle)",
                        opacity: c.attended ? 1 : 0.6,
                      }}
                      onPointerMove={(e) => tip.show(e, <>{meta.name} {c.name}<br /><b>{c.attended ? "Attended" : "Missed"}</b></>)}
                      onPointerLeave={tip.hide}
                    >
                      <PlatformLogo platform={c.platform} size={14} />
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-[color:var(--dash-content-tertiary)]">One square per contest held. Highlighted means you took part.</p>
            </>
          ) : (
            <p className="text-xs text-[color:var(--dash-content-tertiary)]">No contests were held on your platforms this week.</p>
          )}
        </Card>
      )}
      {tip.node}
    </div>
  );
}
