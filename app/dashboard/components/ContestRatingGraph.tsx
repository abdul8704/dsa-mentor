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
  codeforces: "#4ecbf4",
  leetcode: "#ffb700",
  atcoder: "#4edea3",
};

/** Returns the color for a platform key (case-insensitive lookup). */
function getPlatformColor(platform: string): string {
  return KNOWN_PLATFORM_COLORS[platform.toLowerCase()] ?? "#e5e1e4";
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
      <div className="glass-card rounded-xl p-5 lg:p-6 flex flex-col h-full items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-[#a78b82] mb-2">emoji_events</span>
        <h4 className="text-sm text-[#dfc0b6]" style={{ fontFamily: "var(--font-geist-mono)" }}>
          No contest data yet
        </h4>
        <p className="text-xs text-[#a78b82] mt-1">Participate in contests to see your rating graph.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-5 lg:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h4
            className="text-[12px] tracking-[0.05em] font-medium uppercase text-[#dfc0b6]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Contest Rating
          </h4>
          <span className="px-2 py-0.5 bg-[rgba(244,113,68,0.1)] text-[#ffb59d] text-[10px] font-bold rounded">
            {d.percentile}
          </span>
        </div>

        {/* Dropdown — options derived from actual data */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-[#dfc0b6] hover:bg-white/10 transition-colors"
            style={{ fontFamily: "var(--font-geist-mono)" }}
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
            <div className="absolute right-0 top-full mt-1 z-50 bg-[#1e1d20] border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[130px]">
              {filterOptions.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setFilter(p);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[11px] transition-colors flex items-center gap-2 ${
                    filter === p ? "bg-white/10 text-[#e5e1e4]" : "text-[#a78b82] hover:bg-white/5 hover:text-[#dfc0b6]"
                  }`}
                  style={{ fontFamily: "var(--font-geist-mono)" }}
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
        <div className="inline-flex items-center gap-0.5 p-1 rounded-lg bg-white/5 border border-white/10">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setTimeRange(option.label)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                timeRange === option.label
                  ? "bg-[#f47144] text-[#5d1800]"
                  : "text-[#a78b82] hover:text-[#dfc0b6] hover:bg-white/5"
              }`}
              style={{ fontFamily: "var(--font-geist-mono)" }}
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
                className="text-[10px] text-[#a78b82]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 w-full relative min-h-[140px]">
        <svg className="w-full h-full overflow-visible" viewBox={`-16 0 ${chartW + 20} ${50 + 8}`} preserveAspectRatio="none">
          {/* Horizontal grid lines + Y labels */}
          {ticks.map((val) => {
            const y: number = padding + chartH - ((val - minR) / range) * chartH;
            return (
              <g key={val}>
                <line x1="0" x2={chartW} y1={y} y2={y} stroke="white" strokeOpacity="0.05" strokeDasharray="1" />
                <text
                  x="-4"
                  y={y + 1.5}
                  textAnchor="end"
                  fill="#a78b82"
                  fontSize="3.5"
                  fontFamily="var(--font-geist-mono)"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X-axis date labels — use the longest visible platform's points */}
          {(() => {
            // Find the platform with the most data points for x-axis labels
            let longestPts: ContestRatingPoint[] = [];
            for (const key of visiblePlatforms) {
              const pts: ContestRatingPoint[] = filteredPlatformHistories[key] ?? [];
              if (pts.length > longestPts.length) longestPts = pts;
            }
            const months: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return longestPts.map((p, i) => {
              const x: number = (i / Math.max(longestPts.length - 1, 1)) * chartW;
              const dateParts: string[] = p.date.split("-");
              const monthIdx: number = dateParts.length >= 2 ? parseInt(dateParts[1], 10) - 1 : 0;
              // Show every other label to avoid crowding, always show first and last
              if (longestPts.length > 6 && i % 2 !== 0 && i !== longestPts.length - 1) return null;
              return (
                <text
                  key={i}
                  x={x}
                  y={50 + 5}
                  textAnchor="middle"
                  fill="#a78b82"
                  fontSize="3"
                  fontFamily="var(--font-geist-mono)"
                >
                  {months[monthIdx] ?? ""}
                </text>
              );
            });
          })()}

          {/* Platform lines */}
          {visiblePlatforms.map((platform) => {
            const pts: ContestRatingPoint[] = filteredPlatformHistories[platform] ?? [];
            if (pts.length === 0) return null;

            const color: string = getPlatformColor(platform);
            const path: string = buildPath(pts, minR, range, padding, chartH, chartW);
            const gradId: string = `grad-${platform.replace(/\s/g, "")}`;

            // Build fill path coordinates
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
                    stroke="#131315"
                    strokeWidth="0.5"
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Stats Row */}
      <div className="flex justify-between mt-4 pt-3 border-t border-white/5">
        {filter === "All" || !platformStats ? (
          <div className="flex-1 text-center">
            <span className="block text-2xl text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-mono)" }}>
              {d.totalContests}
            </span>
            <span className="text-[9px] text-[#dfc0b6] uppercase">Contests</span>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span className="block text-sm text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                {platformStats.current.toLocaleString()}
              </span>
              <span className="text-[9px] text-[#dfc0b6] uppercase">Current</span>
            </div>
            <div className="text-center">
              <span className={`block text-sm ${platformStats.diff >= 0 ? "text-[#4edea3]" : "text-[#ffb4ab]"}`} style={{ fontFamily: "var(--font-geist-mono)" }}>
                {platformStats.diff >= 0 ? "+" : ""}{platformStats.diff}
              </span>
              <span className="text-[9px] text-[#dfc0b6] uppercase">Last Change</span>
            </div>
            <div className="text-center">
              <span className="block text-sm text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                {platformStats.total}
              </span>
              <span className="text-[9px] text-[#dfc0b6] uppercase">Contests</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
