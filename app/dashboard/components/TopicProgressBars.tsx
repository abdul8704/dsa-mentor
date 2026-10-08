"use client";

import { useEffect, useState } from "react";
import type { TopicStat } from "@/app/lib/types/analytics";

interface TopicProgressBarsProps {
  data?: TopicStat[] | null;
}

const DEFAULT_DATA: TopicStat[] = [
  { topic: "Dynamic Programming", percentage: 65, problemCount: 24, trend: 12 },
  { topic: "Binary Search", percentage: 45, problemCount: 15, trend: 8 },
  { topic: "Greedy Algorithms", percentage: 38, problemCount: 12, trend: -4 },
  { topic: "Two Pointers", percentage: 32, problemCount: 10, trend: 5 },
  { topic: "Sliding Window", percentage: 28, problemCount: 9, trend: 3 },
  { topic: "Stack & Queue", percentage: 22, problemCount: 7, trend: -1 },
  { topic: "Backtracking", percentage: 18, problemCount: 6, trend: 2 },
  { topic: "Graph Theory", percentage: 15, problemCount: 5, trend: -3 },
];

const BAR_COLOR_VARS = [
  "--dash-chart-cat-1",
  "--dash-chart-cat-2",
  "--dash-chart-cat-3",
  "--dash-chart-cat-4",
  "--dash-chart-cat-5",
  "--dash-chart-cat-6",
  "--dash-chart-cat-7",
  "--dash-chart-cat-8",
];

const INITIAL_COUNT = 4;

export default function TopicProgressBars({ data }: TopicProgressBarsProps) {
  const topics = data ?? DEFAULT_DATA;
  const [animated, setAnimated] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const visibleTopics = expanded ? topics : topics.slice(0, INITIAL_COUNT);
  const hasMore = topics.length > INITIAL_COUNT;
  const isEmpty = topics.length === 0;

  return (
    <div className="card-quiet rounded-xl p-6 lg:p-8">
      <h4
        className="tracking-[0.05em] font-medium uppercase text-[color:var(--dash-content-secondary)] mb-6"
        style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-label)" }}
      >
        Topic Breakdown — Last 7 Days
      </h4>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
          <span className="material-symbols-outlined text-3xl text-[color:var(--dash-content-tertiary)]">
            inbox
          </span>
          <p
            className="text-[color:var(--dash-content-secondary)]"
            style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-body)" }}
          >
            No problems solved in the last 7 days
          </p>
        </div>
      ) : (
      <div className="space-y-4" role="img" aria-label={
        `Topic breakdown for the last 7 days: ${topics.map((t) => `${t.topic} ${Math.round(t.percentage)}%, ${t.problemCount} problems`).join("; ")}`
      }>
        {visibleTopics.map((t, i) => {
          // Fixed 0–100 baseline — a bar's length is always the topic's true
          // share, never rescaled against whichever topic happens to be the
          // week's max (which used to exaggerate gaps between topics).
          const barWidth = animated ? Math.min(t.percentage, 100) : 0;
          const trendUp = t.trend >= 0;
          const colorVar = BAR_COLOR_VARS[i % BAR_COLOR_VARS.length];

          return (
            <div key={t.topic} aria-hidden="true">
              {/* Label row: topic name above the bar */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[color:var(--dash-content-secondary)]"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-body)" }}
                >
                  {t.topic}
                </span>
              </div>

              {/* Bar + diff */}
              <div className="flex items-center gap-3">
                {/* Histogram bar — track is the fixed 0–100 axis */}
                <div className="flex-1 h-7 rounded overflow-hidden relative" style={{ background: "var(--dash-surface-sunken)" }}>
                  <div
                    className="h-full rounded transition-all duration-700 ease-out flex items-center justify-center"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: `var(${colorVar})`,
                      transitionDelay: `${i * 100}ms`,
                    }}
                  >
                    {/* Count inside the bar */}
                    <span
                      className="font-bold text-[#131315] drop-shadow-sm"
                      style={{
                        fontFamily: "var(--font-geist-mono)",
                        fontSize: "var(--dash-text-tick)",
                        opacity: animated ? 1 : 0,
                        transition: "opacity 0.3s ease-out",
                        transitionDelay: `${i * 100 + 500}ms`,
                      }}
                    >
                      {t.problemCount}
                    </span>
                  </div>
                </div>

                {/* Trend diff adjacent to bar */}
                <span
                  className="font-semibold w-12 text-right flex-shrink-0"
                  style={{
                    fontFamily: "var(--font-geist-mono)",
                    fontSize: "var(--dash-text-tick)",
                    color: trendUp ? "var(--dash-feedback-success)" : "var(--dash-feedback-danger)",
                  }}
                >
                  {trendUp ? "+" : ""}
                  {t.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Accessible data table mirroring the bars above */}
      {!isEmpty && (
        <table className="sr-only">
          <caption>Topic breakdown, last 7 days</caption>
          <thead>
            <tr><th>Topic</th><th>Problems solved</th><th>Share</th><th>Trend vs. prior week</th></tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.topic}>
                <td>{t.topic}</td>
                <td>{t.problemCount}</td>
                <td>{Math.round(t.percentage)}%</td>
                <td>{t.trend >= 0 ? "+" : ""}{t.trend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* View More / View Less */}
      {!isEmpty && hasMore && (
        <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--dash-border-subtle)" }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-bold flex items-center gap-1 hover:underline transition-colors"
            style={{ color: "var(--dash-accent-soft)" }}
          >
            {expanded ? "View Less" : `View More (${topics.length - INITIAL_COUNT})`}
            <span
              className="material-symbols-outlined text-sm transition-transform duration-200"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              expand_more
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
