"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { ContestRatingData, ContestRatingPoint } from "@/app/lib/types/analytics";

interface ContestRatingGraphProps {
  data?: ContestRatingData | null;
}

/**
 * Assigns a consistent color to each platform name.
 * Falls back to a neutral grey if the platform isn't in the predefined map.
 */
const KNOWN_PLATFORM_COLORS: Record<string, string> = {
  codeforces: "var(--dash-platform-codeforces)",
  leetcode: "var(--dash-platform-leetcode)",
  atcoder: "var(--dash-platform-atcoder)",
};

/** Returns the color for a platform key (case-insensitive lookup). */
function getPlatformColor(platform: string): string {
  return KNOWN_PLATFORM_COLORS[platform.toLowerCase()] ?? "var(--dash-content-primary)";
}

interface TimeRangeOption {
  label: string;
  /** Number of days to look back from today, or null for "All Time" (no filtering). */
  days: number | null;
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
  { label: "All", days: null },
];

/** Returns today's date as an ISO string (YYYY-MM-DD) in local time. */
function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

const DEFAULT_DATA: ContestRatingData = {
  current: 0,
  peak: 0,
  momChange: 0,
  totalContests: 0,
  percentile: "—",
  history: [],
  platformHistories: {},
};

function buildPath(
  points: ContestRatingPoint[],
  minR: number,
  range: number,
  padding: number,
  chartH: number,
  chartW: number
): string {
  if (points.length === 0) return "";
  const coords = points.map((h, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * chartW;
    const y = padding + chartH - ((h.rating - minR) / range) * chartH;
    return { x, y };
  });
  return coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export default function ContestRatingGraph({ data }: ContestRatingGraphProps) {
  const d: ContestRatingData = data ?? DEFAULT_DATA;
  const [filter, setFilter] = useState<string>("All");
  const [timeRange, setTimeRange] = useState<string>("All");
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Derive platform list dynamically from the actual data keys
  const platformNames: string[] = useMemo(
    () => Object.keys(d.platformHistories),
    [d.platformHistories]
  );
  const filterOptions: string[] = useMemo(
    () => ["All", ...platformNames],
    [platformNames]
  );

  // Cutoff date (inclusive) for the selected time range, or null for "All Time"
  const cutoffDate: string | null = useMemo(() => {
    const option: TimeRangeOption | undefined = TIME_RANGE_OPTIONS.find((o) => o.label === timeRange);
    if (!option || option.days === null) return null;

    const date: Date = new Date();
    date.setDate(date.getDate() - option.days);
    return date.toISOString().split("T")[0];
  }, [timeRange]);

  // Per-platform history clipped to the selected time range. If a platform has
  // no contests within the window (but has history overall), fall back to a
  // flat line at its most recent known rating instead of dropping the line.
  const filteredPlatformHistories: Record<string, ContestRatingPoint[]> = useMemo(() => {
    const result: Record<string, ContestRatingPoint[]> = {};

    for (const name of platformNames) {
      const fullHistory: ContestRatingPoint[] = d.platformHistories[name] ?? [];

      if (fullHistory.length === 0) {
        result[name] = [];
        continue;
      }

      if (!cutoffDate) {
        result[name] = fullHistory;
        continue;
      }

      const windowPoints: ContestRatingPoint[] = fullHistory.filter((p) => p.date >= cutoffDate);

      if (windowPoints.length > 0) {
        result[name] = windowPoints;
        continue;
      }

      // No activity in this window — render a flat line at the last known rating.
      const lastKnown: ContestRatingPoint = fullHistory[fullHistory.length - 1];
      result[name] = [
        { ...lastKnown, date: cutoffDate, contestId: `${lastKnown.contestId}-flat-start` },
        { ...lastKnown, date: todayISO(), contestId: `${lastKnown.contestId}-flat-end` },
      ];
    }

    return result;
  }, [platformNames, d.platformHistories, cutoffDate]);

  // Reset filter if the current selection is no longer in the data
  useEffect(() => {
    if (filter !== "All" && !platformNames.includes(filter)) {
      setFilter("All");
    }
  }, [filter, platformNames]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Determine which platform lines to show
  const visiblePlatforms: string[] = useMemo(() => {
    if (filter === "All") return platformNames;
    return [filter];
  }, [filter, platformNames]);

  // Compute global min/max across all visible platforms for consistent scaling
  const { minR, maxR } = useMemo(() => {
    let allRatings: number[] = [];
    for (const key of visiblePlatforms) {
      const pts: ContestRatingPoint[] | undefined = filteredPlatformHistories[key];
      if (pts) allRatings = allRatings.concat(pts.map((p) => p.rating));
    }
    if (allRatings.length === 0) return { minR: 0, maxR: 100 };
    const min: number = Math.min(...allRatings);
    const max: number = Math.max(...allRatings);
    // When all ratings are the same (single data point), ensure a visible range
    if (min === max) return { minR: Math.max(0, min - 100), maxR: max + 100 };
    // Clamp minR to 0 — ratings can't be negative
    return { minR: Math.max(0, min - 50), maxR: max + 50 };
  }, [visiblePlatforms, filteredPlatformHistories]);

  const range: number = maxR - minR || 1;
  const padding: number = 4;
  const chartH: number = 50 - padding * 2;
  const chartW: number = 120;

  // Stats for a single selected platform — computed from the platform's full
  // (unfiltered by time range) history so they reflect true current standing.
  const platformStats: { current: number; diff: number; total: number } | null = useMemo(() => {
    if (filter === "All") return null;
    const hist: ContestRatingPoint[] = d.platformHistories[filter] ?? [];
    const total: number = hist.length;
    const current: number = total > 0 ? hist[total - 1].rating : 0;
    const diff: number = total >= 2 ? hist[total - 1].rating - hist[total - 2].rating : 0;
    return { current, diff, total };
  }, [filter, d.platformHistories]);

  // Y-axis tick values
  const ticks: number[] = useMemo(() => {
    const step: number = Math.ceil(range / 4 / 50) * 50 || 50;
    const start: number = Math.floor(minR / step) * step;
    const result: number[] = [];
    for (let v = start; v <= maxR; v += step) {
      result.push(v);
    }
    return result;
  }, [minR, maxR, range]);

  // If no data at all, show an empty state
  if (platformNames.length === 0 && d.totalContests === 0) {
    return (
      <div className="card-quiet rounded-xl p-5 lg:p-6 flex flex-col h-full items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-[color:var(--dash-content-tertiary)] mb-2">emoji_events</span>
        <h4 className="text-[color:var(--dash-content-secondary)]" style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-body)" }}>
          No contest data yet
        </h4>
        <p className="text-[color:var(--dash-content-tertiary)] mt-1" style={{ fontSize: "var(--dash-text-tick)" }}>Participate in contests to see your rating graph.</p>
      </div>
    );
  }

  return (
    <div className="card-quiet rounded-xl p-5 lg:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h4
            className="tracking-[0.05em] font-medium uppercase text-[color:var(--dash-content-secondary)]"
            style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-label)" }}
          >
            Contest Rating
          </h4>
          <span
            className="px-2 py-0.5 font-bold rounded text-[color:var(--dash-accent-soft)]"
            style={{ background: "color-mix(in srgb, var(--dash-accent) 10%, transparent)", fontSize: "var(--dash-text-caption)" }}
          >
            {d.percentile}
          </span>
        </div>

        {/* Dropdown — options derived from actual data */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[color:var(--dash-content-secondary)] hover:bg-white/10 transition-colors"
            style={{ background: "var(--dash-surface-sunken)", border: "1px solid var(--dash-border-subtle)", fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-tick)" }}
          >
            {filter}
            <span
              className="material-symbols-outlined transition-transform duration-200"
              style={{ fontSize: "14px", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              expand_more
            </span>
          </button>
          {dropdownOpen && (
            <div
              role="listbox"
              className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden min-w-[130px]"
              style={{ background: "#1e1d20", border: "1px solid var(--dash-border-subtle)" }}
            >
              {filterOptions.map((p) => (
                <button
                  key={p}
                  role="option"
                  aria-selected={filter === p}
                  onClick={() => {
                    setFilter(p);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 transition-colors flex items-center gap-2 hover:bg-white/5"
                  style={{
                    fontFamily: "var(--font-geist-mono)",
                    fontSize: "var(--dash-text-tick)",
                    background: filter === p ? "rgba(255,255,255,0.1)" : "transparent",
                    color: filter === p ? "var(--dash-content-primary)" : "var(--dash-content-tertiary)",
                  }}
                >
                  {p !== "All" && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getPlatformColor(p) }}
                    />
                  )}
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time range filter — segmented control below the platform filter */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex items-center gap-0.5 p-1 rounded-lg" style={{ background: "var(--dash-surface-sunken)", border: "1px solid var(--dash-border-subtle)" }}>
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setTimeRange(option.label)}
              aria-pressed={timeRange === option.label}
              className="px-2.5 py-1 rounded-md font-semibold transition-all"
              style={{
                fontFamily: "var(--font-geist-mono)",
                fontSize: "var(--dash-text-tick)",
                background: timeRange === option.label ? "var(--dash-accent)" : "transparent",
                color: timeRange === option.label ? "var(--dash-content-on-accent)" : "var(--dash-content-tertiary)",
              }}
            >
              {option.days === null ? "All Time" : `${option.days}D`}
            </button>
          ))}
        </div>
      </div>

      {/* Legend — only show when All platforms are visible and there are multiple */}
      {filter === "All" && platformNames.length > 1 && (
        <div className="flex gap-4 mb-3">
          {platformNames.map((name) => (
            <div key={name} className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] rounded-full" style={{ backgroundColor: getPlatformColor(name) }} />
              <span
                className="text-[color:var(--dash-content-tertiary)]"
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-tick)" }}
              >
                {name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart — axis text is real HTML layered over the plot, not SVG <text>.
          The SVG uses preserveAspectRatio="none" so the lines/fill stretch to
          fill the box; doing that to <text> too non-uniformly scales the
          glyphs, which is what made the labels unreadable before. */}
      {(() => {
        // Find the platform with the most data points for x-axis labels
        let longestPts: ContestRatingPoint[] = [];
        for (const key of visiblePlatforms) {
          const pts: ContestRatingPoint[] = filteredPlatformHistories[key] ?? [];
          if (pts.length > longestPts.length) longestPts = pts;
        }
        const months: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const chartDescription: string = visiblePlatforms
          .map((platform) => {
            const pts = filteredPlatformHistories[platform] ?? [];
            if (pts.length === 0) return `${platform}: no data in range`;
            return `${platform}: from ${pts[0].rating} to ${pts[pts.length - 1].rating} across ${pts.length} contests`;
          })
          .join("; ");

        return (
          <div className="flex-1 w-full flex flex-col min-h-[220px]">
            <div className="flex-1 flex gap-2 min-h-0" role="img" aria-label={`Contest rating over time. ${chartDescription}`}>
              {/* Y-axis labels */}
              <div className="relative w-9 shrink-0" aria-hidden="true">
                {ticks.map((val) => {
                  const y: number = padding + chartH - ((val - minR) / range) * chartH;
                  return (
                    <span
                      key={val}
                      className="absolute right-0 -translate-y-1/2 leading-none text-[color:var(--dash-content-tertiary)]"
                      style={{ top: `${(y / (padding * 2 + chartH)) * 100}%`, fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-tick)" }}
                    >
                      {val}
                    </span>
                  );
                })}
              </div>

              {/* Plot area */}
              <div className="flex-1 relative">
                <svg
                  className="w-full h-full overflow-visible block"
                  viewBox={`0 0 ${chartW} ${padding * 2 + chartH}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {/* Horizontal grid lines */}
                  {ticks.map((val) => {
                    const y: number = padding + chartH - ((val - minR) / range) * chartH;
                    return (
                      <line key={val} x1="0" x2={chartW} y1={y} y2={y} stroke="white" strokeOpacity="0.05" strokeDasharray="1" />
                    );
                  })}

                  {/* Platform lines */}
                  {visiblePlatforms.map((platform) => {
                    const pts: ContestRatingPoint[] = filteredPlatformHistories[platform] ?? [];
                    if (pts.length === 0) return null;

                    const color: string = getPlatformColor(platform);
                    const path: string = buildPath(pts, minR, range, padding, chartH, chartW);
                    const gradId: string = `grad-${platform.replace(/\s/g, "")}`;

                    const coords = pts.map((h, i) => {
                      const x: number = (i / Math.max(pts.length - 1, 1)) * chartW;
                      const y: number = padding + chartH - ((h.rating - minR) / range) * chartH;
                      return { x, y };
                    });

                    const fillPath: string = coords.length > 0
                      ? `${path} L${coords[coords.length - 1].x.toFixed(1)},${padding + chartH} L${coords[0].x.toFixed(1)},${padding + chartH} Z`
                      : "";

                    const isSinglePlatform: boolean = visiblePlatforms.length === 1;

                    return (
                      <g key={platform}>
                        <defs>
                          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={isSinglePlatform ? "0.15" : "0.08"} />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Gradient fill */}
                        <path d={fillPath} fill={`url(#${gradId})`} />
                        {/* Line */}
                        <path
                          d={path}
                          fill="none"
                          stroke={color}
                          strokeWidth={isSinglePlatform ? "1.8" : "1.2"}
                          vectorEffect="non-scaling-stroke"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                        {/* Dots */}
                        {coords.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={isSinglePlatform ? "1.5" : "1"}
                            fill={color}
                            stroke="var(--dash-surface-base)"
                            strokeWidth="0.5"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* X-axis date labels */}
            <div className="relative h-4 mt-1.5 ml-11" aria-hidden="true">
              {longestPts.map((p, i) => {
                const dateParts: string[] = p.date.split("-");
                const monthIdx: number = dateParts.length >= 2 ? parseInt(dateParts[1], 10) - 1 : 0;
                // Show every other label to avoid crowding, always show first and last
                if (longestPts.length > 6 && i % 2 !== 0 && i !== longestPts.length - 1) return null;
                const leftPct: number = (i / Math.max(longestPts.length - 1, 1)) * 100;
                return (
                  <span
                    key={i}
                    className="absolute top-0 -translate-x-1/2 leading-none text-[color:var(--dash-content-tertiary)] whitespace-nowrap"
                    style={{ left: `${leftPct}%`, fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-tick)" }}
                  >
                    {months[monthIdx] ?? ""}
                  </span>
                );
              })}
            </div>

            {/* Accessible data table mirroring the chart above */}
            <table className="sr-only">
              <caption>Contest rating history</caption>
              <thead>
                <tr><th>Platform</th><th>Date</th><th>Rating</th></tr>
              </thead>
              <tbody>
                {visiblePlatforms.flatMap((platform) =>
                  (filteredPlatformHistories[platform] ?? []).map((pt) => (
                    <tr key={`${platform}-${pt.contestId}`}>
                      <td>{platform}</td>
                      <td>{pt.date}</td>
                      <td>{pt.rating}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Stats Row */}
      <div className="flex justify-between mt-4 pt-3 border-t" style={{ borderColor: "var(--dash-border-subtle)" }}>
        {filter === "All" || !platformStats ? (
          <div className="flex-1 text-center">
            <span className="block font-mono text-[color:var(--dash-content-primary)]" style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-value)" }}>
              {d.totalContests}
            </span>
            <span className="uppercase text-[color:var(--dash-content-secondary)]" style={{ fontSize: "var(--dash-text-caption)" }}>Contests</span>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span className="block text-[color:var(--dash-content-primary)]" style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-value-sm)" }}>
                {platformStats.current.toLocaleString()}
              </span>
              <span className="uppercase text-[color:var(--dash-content-secondary)]" style={{ fontSize: "var(--dash-text-caption)" }}>Current</span>
            </div>
            <div className="text-center">
              <span
                className="block"
                style={{
                  fontFamily: "var(--font-geist-mono)",
                  fontSize: "var(--dash-text-value-sm)",
                  color: platformStats.diff >= 0 ? "var(--dash-feedback-success)" : "var(--dash-feedback-danger)",
                }}
              >
                {platformStats.diff >= 0 ? "+" : ""}{platformStats.diff}
              </span>
              <span className="uppercase text-[color:var(--dash-content-secondary)]" style={{ fontSize: "var(--dash-text-caption)" }}>Last Change</span>
            </div>
            <div className="text-center">
              <span className="block text-[color:var(--dash-content-primary)]" style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-value-sm)" }}>
                {platformStats.total}
              </span>
              <span className="uppercase text-[color:var(--dash-content-secondary)]" style={{ fontSize: "var(--dash-text-caption)" }}>Contests</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
