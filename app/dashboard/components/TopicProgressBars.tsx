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

const BAR_COLORS = [
  "bg-[#ffb59d]",
  "bg-[#4edea3]",
  "bg-[#c8acff]",
  "bg-[#ffb700]",
  "bg-[#1cbaba]",
  "bg-[#f47144]",
  "bg-[#6ffbbe]",
  "bg-[#ffb4ab]",
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
  const maxPct = Math.max(...topics.map((t) => t.percentage), 1);
  const hasMore = topics.length > INITIAL_COUNT;
  const isEmpty = topics.length === 0;

  return (
    <div className="glass-card rounded-xl p-6 lg:p-8">
      <h4
        className="text-[12px] tracking-[0.05em] font-medium uppercase text-[#dfc0b6] mb-6"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        Topic Breakdown — Last 7 Days
      </h4>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
          <span className="material-symbols-outlined text-3xl text-[#a78b82]">
            inbox
          </span>
          <p
            className="text-[13px] text-[#dfc0b6]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            No problems solved in the last 7 days
          </p>
        </div>
      ) : (
      <div className="space-y-4">
        {visibleTopics.map((t, i) => {
          const barWidth = animated ? (t.percentage / maxPct) * 100 : 0;
          const trendUp = t.trend >= 0;
          const colorClass = BAR_COLORS[i % BAR_COLORS.length];

          return (
            <div key={t.topic}>
              {/* Label row: topic name above the bar */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[13px] text-[#dfc0b6]"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  {t.topic}
                </span>
              </div>

              {/* Bar + diff */}
              <div className="flex items-center gap-3">
                {/* Histogram bar */}
                <div className="flex-1 h-7 bg-white/5 rounded overflow-hidden relative">
                  <div
                    className={`${colorClass} h-full rounded transition-all duration-700 ease-out flex items-center justify-center`}
                    style={{
                      width: `${barWidth}%`,
                      transitionDelay: `${i * 100}ms`,
                    }}
                  >
                    {/* Count inside the bar */}
                    <span
                      className="text-[11px] font-bold text-[#131315] drop-shadow-sm"
                      style={{
                        fontFamily: "var(--font-geist-mono)",
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
                  className={`text-xs font-semibold w-12 text-right flex-shrink-0 ${
                    trendUp ? "text-[#4edea3]" : "text-[#ffb4ab]"
                  }`}
                  style={{ fontFamily: "var(--font-geist-mono)" }}
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

      {/* View More / View Less */}
      {!isEmpty && hasMore && (
        <div className="mt-5 pt-4 border-t border-white/5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#ffb59d] font-bold flex items-center gap-1 hover:underline transition-colors"
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
