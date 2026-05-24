"use client";

import { useMemo } from "react";
import type { HeatmapDay } from "@/app/lib/types/analytics";

interface HeatmapProps {
  data?: HeatmapDay[] | null;
}

const INTENSITY_COLORS = [
  "bg-white/5",
  "bg-[rgba(244,113,68,0.15)]",
  "bg-[rgba(244,113,68,0.35)]",
  "bg-[rgba(244,113,68,0.6)]",
  "bg-[#f47144]",
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

const CELL_SIZE = 13; // px
const CELL_GAP = 3;  // px between cells
const MONTH_GAP = 18; // px extra gap between months

function generateDefaultHeatmap(): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const today = new Date();
  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const rand = Math.random();
    let intensity: 0 | 1 | 2 | 3 | 4;
    if (rand < 0.15) intensity = 0;
    else if (rand < 0.35) intensity = 1;
    else if (rand < 0.55) intensity = 2;
    else if (rand < 0.8) intensity = 3;
    else intensity = 4;
    days.push({
      date: d.toISOString().split("T")[0],
      intensity,
      count: intensity * 3,
    });
  }
  return days;
}

/**
 * Structures flat day array into a LeetCode-style grid:
 *   - 7 rows (Mon..Sun)
 *   - Columns = weeks, grouped by month
 *   - Returns month groups, each with its weeks (columns of 7 cells)
 */
interface MonthGroup {
  label: string;
  /** Each week is an array of 7 slots (some may be null for partial weeks) */
  weeks: (HeatmapDay | null)[][];
}

function buildMonthGrid(days: HeatmapDay[]): MonthGroup[] {
  if (days.length === 0) return [];

  // Step 1: Pad the start so the first day aligns to its correct weekday row.
  // JS getDay(): 0=Sun,1=Mon..6=Sat → remap so Mon=0, Sun=6
  const firstDate = new Date(days[0].date);
  const startDow = (firstDate.getDay() + 6) % 7; // Mon=0..Sun=6

  // Build a flat grid padded at the front
  const padded: (HeatmapDay | null)[] = [];
  for (let i = 0; i < startDow; i++) padded.push(null);
  for (const d of days) padded.push(d);
  // Pad at the end to complete the last week
  while (padded.length % 7 !== 0) padded.push(null);

  // Step 2: Split into full weeks (each is a column of 7 cells, top=Mon, bottom=Sun)
  const allWeeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    allWeeks.push(padded.slice(i, i + 7));
  }

  // Step 3: Group weeks by month.
  // A week belongs to the month of its first non-null day.
  // If a week spans two months, it goes to the month that has more days in it.
  const groups: MonthGroup[] = [];
  let currentMonth = -1;

  for (const week of allWeeks) {
    // Find the dominant month in this week
    const monthCounts: Record<number, number> = {};
    for (const cell of week) {
      if (cell) {
        const m = new Date(cell.date).getMonth();
        monthCounts[m] = (monthCounts[m] || 0) + 1;
      }
    }
    const dominantMonth = Object.entries(monthCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const weekMonth = dominantMonth ? parseInt(dominantMonth[0]) : currentMonth;

    if (weekMonth !== currentMonth) {
      // Start new month group
      // But also get the year from the first real day for the label
      const firstReal = week.find((c) => c !== null);
      const year = firstReal ? new Date(firstReal.date).getFullYear() : 0;
      const label = MONTH_NAMES[weekMonth] ?? "";
      groups.push({ label: `${label}`, weeks: [week] });
      currentMonth = weekMonth;
    } else {
      groups[groups.length - 1].weeks.push(week);
    }
  }

  return groups;
}

export default function Heatmap({ data }: HeatmapProps) {
  const heatmapData = useMemo(() => data ?? generateDefaultHeatmap(), [data]);
  const monthGroups = useMemo(() => buildMonthGrid(heatmapData), [heatmapData]);

  return (
    <section className="glass-card rounded-xl p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h3
          className="text-[24px] lg:text-[32px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#e5e1e4]"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          Consistency
        </h3>
        <div
          className="flex gap-2 text-[10px] text-[#dfc0b6] items-center"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          <span>Less</span>
          {INTENSITY_COLORS.map((color, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto flex justify-center">
        <div className="flex items-start" style={{ minWidth: "fit-content" }}>
          {/* Day-of-week labels column */}
          <div
            className="flex flex-col flex-shrink-0 mr-2"
            style={{ gap: `${CELL_GAP}px` }}
          >
            {/* Spacer to match the month label row above the grid */}
            <div style={{ height: `${CELL_SIZE + 4}px` }} />
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="text-[10px] text-[#dfc0b6] flex items-center justify-end"
                style={{
                  height: `${CELL_SIZE}px`,
                  width: "28px",
                  fontFamily: "var(--font-geist-mono)",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Month groups */}
          <div className="flex" style={{ gap: `${MONTH_GAP}px` }}>
            {monthGroups.map((group, gi) => (
              <div key={gi} className="flex flex-col">
                {/* Month label — centered over this month's columns */}
                <div
                  className="text-[10px] text-[#dfc0b6] text-center"
                  style={{
                    fontFamily: "var(--font-geist-mono)",
                    height: `${CELL_SIZE + 4}px`,
                    lineHeight: `${CELL_SIZE + 4}px`,
                  }}
                >
                  {group.label}
                </div>
                {/* Weeks row (each week = one column of 7 cells) */}
                <div className="flex" style={{ gap: `${CELL_GAP}px` }}>
                  {group.weeks.map((week, wi) => (
                    <div
                      key={wi}
                      className="flex flex-col"
                      style={{ gap: `${CELL_GAP}px` }}
                    >
                      {week.map((cell, ci) => (
                        <div
                          key={ci}
                          className={`rounded-sm transition-all hover:scale-150 hover:z-10 ${
                            cell
                              ? `${INTENSITY_COLORS[cell.intensity]} cursor-pointer`
                              : "bg-transparent"
                          }`}
                          style={{
                            width: `${CELL_SIZE}px`,
                            height: `${CELL_SIZE}px`,
                          }}
                          title={
                            cell
                              ? `${cell.date}: ${cell.count} problems`
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
