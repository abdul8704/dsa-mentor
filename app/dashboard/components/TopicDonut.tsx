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

/**
 * Single source of truth for topic colors: index N always maps to the same
 * hue everywhere a topic is drawn (donut segment, legend dot, card text).
 * Values come from the colorblind-safe categorical scale in globals.css —
 * verified distinguishable under deuteranopia/protanopia/tritanopia — so a
 * fix there updates every chart consistently instead of drifting per file.
 */
const TOPIC_COLOR_VARS = [
  "--dash-chart-cat-1",
  "--dash-chart-cat-2",
  "--dash-chart-cat-3",
  "--dash-chart-cat-4",
  "--dash-chart-cat-5",
  "--dash-chart-cat-6",
  "--dash-chart-cat-7",
  "--dash-chart-cat-8",
] as const;

function topicColor(index: number): string {
  return `var(${TOPIC_COLOR_VARS[index % TOPIC_COLOR_VARS.length]})`;
}

/** Color for the "Others" segment */
const OTHERS_COLOR = "var(--dash-content-tertiary)";

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
    const color: string = t.topic === "Others" ? OTHERS_COLOR : topicColor(i);
    const seg = { ...t, dashLen, offset, color };
    offset += dashLen;
    return seg;
  });

  // Total problem count for center label
  const totalProblems: number = allTopics.reduce((sum, t) => sum + t.problemCount, 0);

  const chartDescription =
    chartTopics.length > 0
      ? `Topic breakdown: ${chartTopics
          .map((t) => `${t.topic} ${Math.round(t.percentage)}%`)
          .join(", ")}. ${totalProblems} problems total.`
      : "No topic data yet.";

  return (
    <div className="card-quiet rounded-xl p-6 lg:p-8" style={{ height: "380px" }}>
      <div className="flex items-center justify-between mb-4">
        <h4
          className="tracking-[0.05em] font-medium uppercase text-[color:var(--dash-content-secondary)]"
          style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-label)" }}
        >
          All Time Topic Breakdown
        </h4>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[color:var(--dash-accent-soft)] font-bold flex items-center gap-1 hover:underline transition-colors"
            style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-tick)" }}
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

      {allTopics.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center h-[calc(100%-40px)] gap-2">
          <span className="material-symbols-outlined text-3xl text-[color:var(--dash-content-tertiary)]">
            donut_large
          </span>
          <p
            className="text-[color:var(--dash-content-secondary)]"
            style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-body)" }}
          >
            No topics solved yet
          </p>
        </div>
      ) : !expanded ? (
        /* ── Collapsed: Donut + Topic cards side-by-side ── */
        <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-10 h-[calc(100%-40px)]">
          {/* Donut */}
          <div
            className="w-36 h-36 lg:w-44 lg:h-44 relative flex-shrink-0"
            role="img"
            aria-label={chartDescription}
          >
            <div className="absolute inset-0 rounded-full border-[12px] border-[color:var(--dash-surface-sunken)]" />
            <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100" aria-hidden="true">
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

          {/* Topic Cards — these double as the chart's direct labels */}
          <div className="flex-1 grid grid-cols-2 gap-3 auto-rows-min">
            {chartTopics.map((t, i) => {
              const textColor: string = t.topic === "Others" ? OTHERS_COLOR : topicColor(i);
              return (
                <div key={t.topic} className="p-2.5 rounded-lg" style={{ background: "var(--dash-surface-sunken)", border: "1px solid var(--dash-border-subtle)" }}>
                  <span
                    className="uppercase block text-[color:var(--dash-content-secondary)]"
                    style={{ fontSize: "var(--dash-text-caption)" }}
                  >
                    {t.topic}
                  </span>
                  <span
                    className="text-lg font-semibold"
                    style={{ fontFamily: "var(--font-geist-sans)", color: textColor }}
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
          <div
            className="w-28 h-28 relative flex-shrink-0"
            role="img"
            aria-label={chartDescription}
          >
            <div className="absolute inset-0 rounded-full border-[8px] border-[color:var(--dash-surface-sunken)]" />
            <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100" aria-hidden="true">
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
                const dotColor: string = t.topic === "Others" ? OTHERS_COLOR : topicColor(i);
                return (
                  <div key={t.topic} className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span
                      className="text-[color:var(--dash-content-secondary)] truncate"
                      style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-tick)" }}
                    >
                      {t.topic}
                    </span>
                    <span
                      className="font-semibold ml-auto flex-shrink-0"
                      style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-tick)" }}
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

      {/* Accessible data table — same information as the donut, for screen
          readers and anyone who wants exact values without hovering. */}
      {allTopics.length > 0 && (
        <table className="sr-only">
          <caption>Topic breakdown, {accuracy}% overall accuracy</caption>
          <thead>
            <tr><th>Topic</th><th>Problems solved</th><th>Share</th></tr>
          </thead>
          <tbody>
            {allTopics.map((t) => (
              <tr key={t.topic}>
                <td>{t.topic}</td>
                <td>{t.problemCount}</td>
                <td>{Math.round(t.percentage)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
