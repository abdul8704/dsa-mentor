"use client";

import { useEffect, useMemo, useRef } from "react";
import type { HeatmapDay } from "@/app/lib/types/analytics";
import Card, { EmptyState } from "./ui/Card";
import { useChartTip } from "./ui/interaction";

interface HeatmapProps {
  data?: HeatmapDay[] | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-03-15" → local Date (avoids the UTC shift of `new Date(iso)`). */
function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function fmt(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString("en-GB", opts);
}

interface MonthBlock {
  key: string;
  label: string;
  /** Empty slots before the 1st so it lands on its weekday row (Mon = row 1). */
  lead: number;
  days: { day: HeatmapDay; date: Date }[];
}

/**
 * LeetCode-style activity calendar: one block per month with a gap between
 * months, each month starting on its real weekday row. Single-hue green ramp
 * by intensity; exact counts in the tooltip and the totals row underneath.
 */
export default function Heatmap({ data }: HeatmapProps) {
  const days = useMemo(() => data ?? [], [data]);
  const tip = useChartTip();
  const scroller = useRef<HTMLDivElement>(null);

  const months: MonthBlock[] = useMemo(() => {
    const out: MonthBlock[] = [];
    for (const day of days) {
      const date = parseDay(day.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      let m = out[out.length - 1];
      if (!m || m.key !== key) {
        m = { key, label: MONTHS[date.getMonth()], lead: (date.getDay() + 6) % 7, days: [] };
        out.push(m);
      }
      m.days.push({ day, date });
    }
    return out;
  }, [days]);

  const stats = useMemo(() => {
    const total = days.reduce((a, d) => a + d.count, 0);
    const active = days.filter((d) => d.count > 0).length;
    const best = days.reduce<HeatmapDay | null>((a, d) => (d.count > (a?.count ?? 0) ? d : a), null);
    return { total, active, best };
  }, [days]);

  // Most recent month is on the right; start scrolled there on narrow screens.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [months.length]);

  return (
    <Card
      title="Activity"
      hint={`last ${days.length || 364} days`}
      action={
        <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--dash-content-tertiary)]" aria-hidden="true">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className="dash-hm-cell w-[11px] h-[11px] inline-block" data-l={l} />
          ))}
          More
        </span>
      }
    >
      {days.length === 0 ? (
        <EmptyState icon="calendar_month" title="No activity yet" hint="Solve a problem on any connected platform and it shows up here." />
      ) : (
        <>
          <div ref={scroller} className="overflow-x-auto pb-1 -mx-1 px-1">
            <div
              className="flex gap-[10px] w-max mx-auto"
              role="img"
              aria-label={`Daily solves over the last ${days.length} days: ${stats.total} problems on ${stats.active} active days.`}
            >
              <div className="grid grid-rows-[repeat(7,12px)] gap-[3px] pr-1 text-[10px] leading-[12px] text-[color:var(--dash-content-tertiary)]" aria-hidden="true">
                <span />
                <span>Mon</span>
                <span />
                <span>Wed</span>
                <span />
                <span>Fri</span>
                <span />
              </div>
              {months.map((m, mi) => (
                <div key={m.key} className="flex flex-col gap-1.5" aria-hidden="true">
                  <div className="grid grid-rows-[repeat(7,12px)] grid-flow-col auto-cols-[12px] gap-[3px]">
                    {Array.from({ length: m.lead }, (_, i) => (
                      <i key={`pad-${i}`} />
                    ))}
                    {m.days.map(({ day, date }, di) => (
                      <i
                        key={day.date}
                        className="dash-hm-cell dash-anim-fade"
                        data-l={day.intensity}
                        style={{ animationDelay: `${Math.min(600, (mi * 31 + di) * 1.6)}ms` }}
                        onPointerMove={(e) =>
                          tip.show(e, (
                            <>
                              {fmt(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                              <br />
                              <b className="dash-num">{day.count}</b> solved
                            </>
                          ))
                        }
                        onPointerLeave={tip.hide}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-[color:var(--dash-content-tertiary)]">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[color:var(--dash-border-subtle)]">
            <div>
              <dt className="dash-label">Solved in range</dt>
              <dd className="dash-num text-lg font-semibold text-[color:var(--dash-content-primary)]">{stats.total.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="dash-label">Active days</dt>
              <dd className="dash-num text-lg font-semibold text-[color:var(--dash-content-primary)]">
                {stats.active} <span className="text-sm text-[color:var(--dash-content-tertiary)]">/ {days.length}</span>
              </dd>
            </div>
            <div>
              <dt className="dash-label">Best day</dt>
              <dd className="dash-num text-lg font-semibold text-[color:var(--dash-content-primary)]">
                {stats.best ? (
                  <>
                    {stats.best.count}{" "}
                    <span className="text-sm text-[color:var(--dash-content-tertiary)]">
                      · {fmt(parseDay(stats.best.date), { day: "numeric", month: "short" })}
                    </span>
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </>
      )}
      {tip.node}
    </Card>
  );
}
