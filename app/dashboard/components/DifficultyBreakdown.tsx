"use client";

import { useEffect, useState } from "react";
import type { DifficultyStats } from "@/app/lib/types/analytics";

interface DifficultyBreakdownProps {
  data?: DifficultyStats | null;
}

const DIFFICULTY_ITEMS = [
  { key: "easy" as const, label: "Easy", color: "var(--dash-feedback-success)" },
  { key: "medium" as const, label: "Medium", color: "var(--dash-accent)" },
  { key: "hard" as const, label: "Hard", color: "var(--dash-feedback-danger)" },
];

/**
 * NOTE: not currently wired into any page — kept here for reuse on a future
 * per-platform breakdown view. `StatsOverview` covers this on the main
 * dashboard today.
 */
export default function DifficultyBreakdown({ data }: DifficultyBreakdownProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const isEmpty = !data || data.total === 0;
  const total = data?.total || 1;
  const easyPct = ((data?.easy ?? 0) / total) * 100;
  const mediumPct = ((data?.medium ?? 0) / total) * 100;
  const hardPct = ((data?.hard ?? 0) / total) * 100;

  return (
    <div className="card-quiet rounded-xl p-5 lg:p-6">
      <h4
        className="tracking-[0.05em] font-medium uppercase text-[color:var(--dash-content-secondary)] mb-6"
        style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-label)" }}
      >
        Difficulty Breakdown
      </h4>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center text-center py-6 gap-2">
          <span className="material-symbols-outlined text-3xl text-[color:var(--dash-content-tertiary)]">
            bar_chart
          </span>
          <p
            className="text-[color:var(--dash-content-secondary)]"
            style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-body)" }}
          >
            No problems solved yet
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          {/* Donut Chart */}
          <div
            className="relative w-28 h-28 lg:w-32 lg:h-32 flex items-center justify-center flex-shrink-0"
            role="img"
            aria-label={`Difficulty breakdown: ${data!.easy} easy, ${data!.medium} medium, ${data!.hard} hard, out of ${data!.total} total problems solved`}
          >
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              {/* Background */}
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--dash-surface-sunken)" strokeWidth="3" />
              {/* Easy */}
              <circle
                cx="18" cy="18" r="16" fill="none"
                stroke="var(--dash-feedback-success)" strokeWidth="3"
                strokeDasharray={animated ? `${easyPct} ${100 - easyPct}` : "0 100"}
                strokeDashoffset="0"
                className="transition-all duration-1000 ease-out"
              />
              {/* Medium */}
              <circle
                cx="18" cy="18" r="16" fill="none"
                stroke="var(--dash-accent)" strokeWidth="3"
                strokeDasharray={animated ? `${mediumPct} ${100 - mediumPct}` : "0 100"}
                strokeDashoffset={`-${easyPct}`}
                className="transition-all duration-1000 ease-out delay-200"
              />
              {/* Hard */}
              <circle
                cx="18" cy="18" r="16" fill="none"
                stroke="var(--dash-feedback-danger)" strokeWidth="3"
                strokeDasharray={animated ? `${hardPct} ${100 - hardPct}` : "0 100"}
                strokeDashoffset={`-${easyPct + mediumPct}`}
                className="transition-all duration-1000 ease-out delay-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-bold" style={{ fontFamily: "var(--font-geist-sans)", fontSize: "var(--dash-text-value)" }}>
                {data!.total}
              </span>
              <span className="uppercase opacity-50" style={{ fontSize: "var(--dash-text-caption)" }}>Total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-3">
            {DIFFICULTY_ITEMS.map((item) => (
              <div key={item.key} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span
                    className="text-[color:var(--dash-content-secondary)]"
                    style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-body)" }}
                  >
                    {item.label}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-value-sm)" }}>
                  {data![item.key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
