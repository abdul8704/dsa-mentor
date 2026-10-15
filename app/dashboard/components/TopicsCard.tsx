"use client";

import { useMemo, useState } from "react";
import type { TopicBreakdownData, TopicStat } from "@/app/lib/types/analytics";
import Card, { EmptyState } from "./ui/Card";
import { Segmented, useChartTip } from "./ui/interaction";

const TOP_N = 8;

type View = "all" | "week";

/**
 * Topics as ranked horizontal bars: with 10–20 topics, bar length compares far
 * better than donut slices, and long names fit as row labels. "All time" shows
 * the top 8 plus an Others row (expandable); "Last 7 days" adds a ▲/▼ column
 * with the change in count vs the week before.
 */
export default function TopicsCard({ data }: { data?: TopicBreakdownData | null }) {
  const [view, setView] = useState<View>("all");
  const [expanded, setExpanded] = useState(false);
  const tip = useChartTip();

  const allTime = useMemo(() => data?.allTime ?? [], [data]);
  const week = useMemo(() => data?.last7Days ?? [], [data]);
  const source = view === "all" ? allTime : week;

  const rows: (TopicStat & { others?: boolean })[] = useMemo(() => {
    if (view === "week" || expanded || source.length <= TOP_N + 1) return source;
    const rest = source.slice(TOP_N);
    return [
      ...source.slice(0, TOP_N),
      {
        topic: `Others (${rest.length} topics)`,
        problemCount: rest.reduce((a, t) => a + t.problemCount, 0),
        percentage: rest.reduce((a, t) => a + t.percentage, 0),
        trend: 0,
        others: true,
      },
    ];
  }, [source, view, expanded]);

  const max = Math.max(...source.map((t) => t.problemCount), 1);

  return (
    <Card
      title="Topics"
      hint={view === "all" ? "share of tags across all solved problems" : "tags solved in the last 7 days, change vs the week before"}
      action={
        <Segmented
          label="Period"
          value={view}
          onChange={(v) => setView(v)}
          options={[
            { value: "all", label: "All time" },
            { value: "week", label: "Last 7 days" },
          ]}
        />
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon="sell"
          title={view === "all" ? "No topics yet" : "No topics this week"}
          hint={view === "all" ? "Tags from solved problems show up here." : "Solve something this week to see what you practised."}
        />
      ) : (
        <ul key={view} className="flex flex-col gap-1" aria-label={view === "all" ? "Topics, all time" : "Topics, last 7 days"}>
          {rows.map((t, i) => {
            const width = t.others ? (t.problemCount / Math.max(t.problemCount, max)) * 100 : (t.problemCount / max) * 100;
            return (
              <li
                key={t.topic}
                className="dash-row grid grid-cols-[minmax(96px,170px)_minmax(0,1fr)_3.5ch_4.5rem] items-center gap-3 px-2 py-1.5 -mx-2 text-[13px]"
                onPointerMove={(e) =>
                  tip.show(e, (
                    <>
                      {t.topic}: <b className="dash-num">{t.problemCount}</b> ({Math.round(t.percentage)}%)
                      {view === "week" && <> · {t.trend >= 0 ? "+" : ""}{t.trend} vs prior week</>}
                    </>
                  ))
                }
                onPointerLeave={tip.hide}
              >
                <span className={`truncate ${t.others ? "text-[color:var(--dash-content-tertiary)]" : "text-[color:var(--dash-content-secondary)]"}`}>{t.topic}</span>
                <span className="h-2 rounded-full bg-[color:var(--dash-surface-hover)] overflow-hidden">
                  <i
                    className="block h-full rounded-full dash-anim-grow-x"
                    style={{
                      width: `${Math.max(2, width)}%`,
                      background: t.others ? "var(--dash-chart-cat-8)" : "var(--dash-grad-accent)",
                      animationDelay: `${i * 45}ms`,
                    }}
                  />
                </span>
                <b className="dash-num text-right font-semibold text-[color:var(--dash-content-primary)]">{t.problemCount}</b>
                {view === "week" ? (
                  <span
                    className="dash-num text-right text-xs font-semibold"
                    style={{ color: t.trend > 0 ? "var(--dash-feedback-success)" : t.trend < 0 ? "var(--dash-feedback-danger)" : "var(--dash-content-tertiary)" }}
                  >
                    {t.trend > 0 ? `▲ ${t.trend}` : t.trend < 0 ? `▼ ${-t.trend}` : "–"}
                  </span>
                ) : (
                  <span className="dash-num text-right text-xs text-[color:var(--dash-content-tertiary)]">{Math.round(t.percentage)}%</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {view === "all" && allTime.length > TOP_N + 1 && (
        <button type="button" className="dash-btn dash-btn-ghost dash-btn-sm self-start" onClick={() => setExpanded((x) => !x)} aria-expanded={expanded}>
          {expanded ? "Show top 8" : `Show all ${allTime.length} topics`}
        </button>
      )}
      {tip.node}
    </Card>
  );
}
