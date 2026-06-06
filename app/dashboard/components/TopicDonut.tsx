"use client";

import { useEffect, useMemo, useState } from "react";
import type { TopicBreakdownData, TopicStat } from "@/app/lib/types/analytics";

interface TopicDonutProps {
  data?: TopicBreakdownData | null;
}

const DEFAULT_DATA: { accuracy: number; allTime: TopicStat[] } = {
  accuracy: 0,
  allTime: [],
};

/** Maximum topics shown in collapsed view — rest collapse into "Others" */
const MAX_VISIBLE = 5;

const TOPIC_COLORS = [
  "#f47144", "#4edea3", "#6ffbbe", "#ffb700", "#c8acff",
  "#1cbaba", "#ffb4ab", "#93000a", "#a78b82", "#e5e1e4",
];

const TOPIC_TEXT_COLORS = [
  "text-[#ffb59d]", "text-[#4edea3]", "text-[#6ffbbe]", "text-[#ffb700]", "text-[#c8acff]",
  "text-[#1cbaba]", "text-[#ffb4ab]", "text-[#ffb4ab]", "text-[#a78b82]", "text-[#e5e1e4]",
];

/** Color for the "Others" segment */
const OTHERS_COLOR = "#555258";

export default function TopicDonut({ data }: TopicDonutProps) {
  const accuracy: number = data?.accuracy ?? DEFAULT_DATA.accuracy;
  const allTopics: TopicStat[] = data?.allTime ?? DEFAULT_DATA.allTime;
  const [animated, setAnimated] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const hasMore: boolean = allTopics.length > MAX_VISIBLE;

  /**
   * Collapsed view: top 5 topics + "Others" bucket.
   * Expanded view: all topics shown.
   */
  const { displayTopics, othersEntry } = useMemo(() => {
    if (!hasMore || expanded) {
      return { displayTopics: allTopics, othersEntry: null };
    }

    const top: TopicStat[] = allTopics.slice(0, MAX_VISIBLE);
    const rest: TopicStat[] = allTopics.slice(MAX_VISIBLE);

    const othersProblemCount: number = rest.reduce((sum, t) => sum + t.problemCount, 0);
    const othersPercentage: number = rest.reduce((sum, t) => sum + t.percentage, 0);

    const others: TopicStat = {
      topic: "Others",
      percentage: othersPercentage,
      problemCount: othersProblemCount,
      trend: 0,
    };

    return { displayTopics: top, othersEntry: others };
  }, [allTopics, hasMore, expanded]);

  // Combine topics + optional Others for the donut segments
  const chartTopics: TopicStat[] = useMemo(() => {
    const list: TopicStat[] = [...displayTopics];
    if (othersEntry) list.push(othersEntry);
    return list;
  }, [displayTopics, othersEntry]);

  // Build donut segments — use raw problemCount proportions instead of the
  // pre-rounded `percentage` field so the segments always form a full circle.
  const circumference: number = 2 * Math.PI * 39;
  const totalForChart: number = chartTopics.reduce((sum, t) => sum + t.problemCount, 0) || 1;
  let offset = 0;
  const segments = chartTopics.map((t, i) => {
    const proportion: number = t.problemCount / totalForChart;
    const dashLen: number = proportion * circumference;
    const color: string = t.topic === "Others" ? OTHERS_COLOR : TOPIC_COLORS[i % TOPIC_COLORS.length];
    const seg = { ...t, dashLen, offset, color };
    offset += dashLen;
    return seg;
  });

  // Total problem count for center label
  const totalProblems: number = allTopics.reduce((sum, t) => sum + t.problemCount, 0);

  return (
    <div className="glass-card rounded-xl p-6 lg:p-8" style={{ height: "380px" }}>
      <div className="flex items-center justify-between mb-4">
        <h4
          className="text-[12px] tracking-[0.05em] font-medium uppercase text-[#dfc0b6]"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          All Time Topic Breakdown
        </h4>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-[#ffb59d] font-bold flex items-center gap-1 hover:underline transition-colors"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {expanded ? "View Less" : `View More (${allTopics.length - MAX_VISIBLE})`}
            <span
              className="material-symbols-outlined text-sm transition-transform duration-200"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              expand_more
            </span>
          </button>
        )}
      </div>

      {/* ── Collapsed: Donut + Topic cards side-by-side ── */}
      {!expanded ? (
        <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-10 h-[calc(100%-40px)]">
          {/* Donut */}
          <div className="w-36 h-36 lg:w-44 lg:h-44 relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full border-[12px] border-white/5" />
            <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
              {segments.map((seg, i) => (
                <circle
                  key={seg.topic}
                  cx="50" cy="50" r="41" fill="none"
                  stroke={seg.color}
                  strokeWidth="12"
                  strokeDasharray={animated ? `${seg.dashLen} ${circumference - seg.dashLen}` : `0 ${circumference}`}
                  strokeDashoffset={-seg.offset}
                  className="transition-all duration-1000 ease-out"
                  style={{ transitionDelay: `${i * 150}ms` }}
                />
              ))}
            </svg>
          </div>

          {/* Topic Cards */}
          <div className="flex-1 grid grid-cols-2 gap-3 auto-rows-min">
            {chartTopics.map((t, i) => {
              const textColor: string =
                t.topic === "Others"
                  ? "text-[#a78b82]"
                  : TOPIC_TEXT_COLORS[i % TOPIC_TEXT_COLORS.length];
              return (
                <div key={t.topic} className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] text-[#dfc0b6] uppercase block">{t.topic}</span>
                  <span
                    className={`text-lg font-semibold ${textColor}`}
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    {t.problemCount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Expanded: Centered donut with compact labels below ── */
        <div className="flex flex-col items-center h-[calc(100%-40px)] overflow-hidden">
          {/* Smaller centered donut */}
          <div className="w-28 h-28 relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full border-[8px] border-white/5" />
            <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
              {segments.map((seg, i) => (
                <circle
                  key={seg.topic}
                  cx="50" cy="50" r="41" fill="none"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={animated ? `${seg.dashLen} ${circumference - seg.dashLen}` : `0 ${circumference}`}
                  strokeDashoffset={-seg.offset}
                  className="transition-all duration-700 ease-out"
                  style={{ transitionDelay: `${i * 80}ms` }}
                />
              ))}
            </svg>
          </div>

          {/* Compact scrollable label list */}
          <div className="flex-1 w-full mt-3 overflow-y-auto pr-1 custom-scrollbar">
            <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
              {chartTopics.map((t, i) => {
                const dotColor: string =
                  t.topic === "Others"
                    ? OTHERS_COLOR
                    : TOPIC_COLORS[i % TOPIC_COLORS.length];
                return (
                  <div key={t.topic} className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span
                      className="text-[10px] text-[#dfc0b6] truncate"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {t.topic}
                    </span>
                    <span
                      className="text-[10px] font-semibold text-[#e5e1e4] ml-auto flex-shrink-0"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {t.problemCount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
