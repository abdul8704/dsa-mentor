"use client";

import { useState, type KeyboardEvent } from "react";
import { useMounted } from "./ui/useMounted";
import type { StreakData } from "@/app/lib/types/analytics";
import Card, { Delta } from "./ui/Card";
import CountUp from "./ui/CountUp";
import PlatformSplit from "./ui/PlatformSplit";

interface DayLabel {
  short: string;
  long: string;
}

/** Labels for the last 7 days, oldest first; computed on the client (viewer's timezone). */
function useDayLabels(): DayLabel[] {
  const mounted = useMounted();
  const out: DayLabel[] = [];
  for (let i = 6; i >= 0; i--) {
    if (!mounted) {
      out.push({ short: i === 0 ? "Today" : "", long: i === 0 ? "Today" : `${i} days ago` });
      continue;
    }
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      short: d.toLocaleDateString(undefined, { weekday: "short" }),
      long: i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" }),
    });
  }
  return out;
}

/**
 * Last 7 days as columns that fill the card's height. Each column is a button:
 * selecting a day swaps the platform split underneath from the whole week to
 * that day. Today is the gradient column; Esc or "Whole week" clears the pick.
 */
export default function Last7DaysCard({ streak }: { streak: StreakData }) {
  const v = streak.last7DaysBreakdown.length === 7 ? streak.last7DaysBreakdown : [0, 0, 0, 0, 0, 0, 0];
  const byDay = streak.last7DaysBreakdownByPlatform ?? [];
  const days = useDayLabels();
  const [sel, setSel] = useState<number | null>(null);

  const peak = Math.max(...v, 1);
  const step = Math.max(1, Math.ceil(peak / 2));
  const max = step * 2;
  const ticks = [max, step, 0];

  const counts = sel === null ? streak.last7DaysByPlatform : byDay[sel] ?? {};
  const shown = sel === null ? streak.last7DaysSolved : v[sel];

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape" && sel !== null) setSel(null);
  }

  return (
    <Card title="Last 7 days" hint="problems solved per day" action={<Delta value={streak.last7DaysChange} suffix="%" />}>
      <div className="flex items-baseline gap-2 min-h-[44px]" aria-live="polite">
        <span className="dash-num dash-hero-num">
          <CountUp value={shown} duration={sel === null ? 900 : 450} />
        </span>
        <span className="text-[13px] text-[color:var(--dash-content-tertiary)]">
          {sel === null ? "solved this week" : `solved ${days[sel].long === "Today" ? "today" : `on ${days[sel].long}`}`}
        </span>
      </div>

      {/* Chart grows with the card so a tall neighbour never leaves dead space. */}
      <div className="flex-1 min-h-[180px] flex flex-col" onKeyDown={onKey}>
        <div className="relative flex-1 min-h-0">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute left-0 right-0 flex items-center gap-2 pointer-events-none"
              style={{ top: `${(1 - t / max) * 100}%`, transform: "translateY(-50%)" }}
              aria-hidden="true"
            >
              <span className="dash-num w-5 text-right text-[10px] text-[color:var(--dash-content-tertiary)]">{t}</span>
              <i className="flex-1 h-px bg-[color:var(--dash-border-subtle)]" />
            </div>
          ))}

          <div className="absolute inset-0 left-7 grid grid-cols-7 gap-1.5" role="group" aria-label="Pick a day to see its platform split">
            {v.map((n, i) => {
              const today = i === 6;
              const on = sel === i;
              const dim = sel !== null && !on;
              const pct = (n / max) * 100;
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${days[i].long}: ${n} solved`}
                  onClick={() => setSel((p) => (p === i ? null : i))}
                  className="group relative h-full flex flex-col justify-end items-center rounded-[var(--dash-r-md)] transition-colors duration-[var(--dash-dur-fast)] hover:bg-[color:var(--dash-surface-sunken)] focus-visible:bg-[color:var(--dash-surface-sunken)]"
                  style={{ background: on ? "var(--dash-accent-wash)" : undefined }}
                >
                  {n > 0 ? (
                    <>
                      <span
                        className={`dash-num text-[11px] font-semibold mb-1 transition-opacity duration-[var(--dash-dur-fast)] ${
                          on || (today && sel === null) ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                        }`}
                        style={{ color: on ? "var(--dash-accent-soft)" : "var(--dash-content-primary)" }}
                      >
                        {n}
                      </span>
                      <i
                        className="dash-anim-grow-y block w-[62%] max-w-[44px] rounded-t-[6px] rounded-b-[2px] transition-[opacity,transform,box-shadow] duration-[var(--dash-dur-base)] group-hover:opacity-100 group-hover:-translate-y-0.5"
                        style={{
                          height: `${pct}%`,
                          animationDelay: `${i * 50}ms`,
                          background: on || (today && sel === null) ? "var(--dash-grad-accent-v)" : "var(--dash-accent)",
                          opacity: on || (today && sel === null) ? 1 : dim ? 0.22 : 0.42,
                          boxShadow: on ? "var(--dash-shadow-accent)" : undefined,
                        }}
                      />
                    </>
                  ) : (
                    <i className="block w-[62%] max-w-[44px] h-[2px] rounded-full bg-[color:var(--dash-border-strong)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 ml-7 mt-2" aria-hidden="true">
          {days.map((d, i) => {
            const strong = sel === i || (sel === null && i === 6);
            return (
              <span
                key={i}
                className="text-center text-[11px] transition-colors duration-[var(--dash-dur-fast)]"
                style={{ color: strong ? "var(--dash-content-primary)" : "var(--dash-content-tertiary)", fontWeight: strong ? 600 : 400 }}
              >
                {d.short}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-3 border-t border-[color:var(--dash-border-subtle)]">
        <div className="flex items-center gap-2 min-h-[32px]">
          <span className="dash-label">{sel === null ? "This week by platform" : `${days[sel].long} by platform`}</span>
          <button
            type="button"
            onClick={() => setSel(null)}
            tabIndex={sel === null ? -1 : 0}
            aria-hidden={sel === null}
            className={`dash-btn dash-btn-ghost dash-btn-sm ml-auto dash-fade-swap ${sel === null ? "dash-hidden-swap" : ""}`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              arrow_back
            </span>
            Whole week
          </button>
        </div>
        <PlatformSplit key={sel ?? "week"} counts={counts} columns={2} />
      </div>
    </Card>
  );
}
