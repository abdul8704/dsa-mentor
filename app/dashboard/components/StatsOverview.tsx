"use client";

import { useEffect, useMemo, useState } from "react";
import type { DifficultyStats, PlatformDifficultyMap, PlatformStat } from "@/app/lib/types/analytics";

interface StatsOverviewProps {
  /** Per-platform difficulty map; key "all" = combined totals */
  difficulty?: PlatformDifficultyMap | null;
  platforms?: PlatformStat[] | null;
}

const DEFAULT_DIFFICULTY: PlatformDifficultyMap = {
  all: { easy: 0, medium: 0, hard: 0, total: 0 },
};

const PLATFORM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  primary: { bg: "color-mix(in srgb, var(--dash-accent) 8%, transparent)", border: "color-mix(in srgb, var(--dash-accent) 20%, transparent)", text: "var(--dash-accent-soft)" },
  tertiary: { bg: "color-mix(in srgb, var(--dash-feedback-success) 8%, transparent)", border: "color-mix(in srgb, var(--dash-feedback-success) 20%, transparent)", text: "var(--dash-feedback-success)" },
  secondary: { bg: "var(--dash-surface-sunken)", border: "var(--dash-border-strong)", text: "var(--dash-content-primary)" },
};

/** Active (selected) platform pill styles */
const PLATFORM_ACTIVE_COLORS: Record<string, { bg: string; border: string }> = {
  primary: { bg: "color-mix(in srgb, var(--dash-accent) 22%, transparent)", border: "color-mix(in srgb, var(--dash-accent) 55%, transparent)" },
  tertiary: { bg: "color-mix(in srgb, var(--dash-feedback-success) 22%, transparent)", border: "color-mix(in srgb, var(--dash-feedback-success) 55%, transparent)" },
  secondary: { bg: "var(--dash-surface-sunken)", border: "var(--dash-border-strong)" },
};

/** Map platform names → color keys for UI styling */
const PLATFORM_COLOR_MAP: Record<string, "primary" | "tertiary" | "secondary"> = {
  leetcode: "primary",
  atcoder: "tertiary",
  codeforces: "secondary",
  cses: "secondary", // reuses Codeforces' color key rather than adding a 4th
};

const DIFFICULTY_ITEMS = [
  { key: "easy" as const, label: "Easy", color: "var(--dash-feedback-success)" },
  { key: "medium" as const, label: "Medium", color: "var(--dash-feedback-warning)" },
  { key: "hard" as const, label: "Hard", color: "var(--dash-feedback-danger)" },
];

const DONUT_RADIUS = 40;
const DONUT_STROKE = 12;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

/**
 * Represents a single pill in the bottom platform row.
 * Can be derived from either the PlatformStat[] prop or the
 * PlatformDifficultyMap keys (fallback).
 */
interface PlatformPill {
  name: string;
  solvedCount: number;
  colorKey: "primary" | "tertiary" | "secondary";
}

export default function StatsOverview({ difficulty, platforms }: StatsOverviewProps) {
  const diffMap: PlatformDifficultyMap = difficulty ?? DEFAULT_DIFFICULTY;
  /**
   * Build platform pills from either:
   * 1. The `platforms` prop (if provided and non-empty) — uses real rating data
   * 2. The `difficulty` map keys (fallback) — derives from solved problems data
   */
  const pills: PlatformPill[] = useMemo(() => {
    if (platforms && platforms.length > 0) {
      return platforms.map((p): PlatformPill => ({
        name: p.platform,
        solvedCount: p.solvedCount,
        colorKey: p.color,
      }));
    }

    const platformKeys: string[] = Object.keys(diffMap).filter((k) => k !== "all");
    if (platformKeys.length > 0) {
      return platformKeys.map((key): PlatformPill => ({
        name: key,
        solvedCount: diffMap[key]?.total ?? 0,
        colorKey: PLATFORM_COLOR_MAP[key] ?? "primary",
      }));
    }

    return [];
  }, [platforms, diffMap]);

  /** null = "all platforms combined", string = specific platform key */
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [animated, setAnimated] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Reset animation on platform change so the donut re-draws
  useEffect(() => {
    setAnimated(false);
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, [selectedPlatform]);

  // Resolve the active difficulty stats from the map
  const d: DifficultyStats = selectedPlatform === null
    ? (diffMap["all"] ?? { easy: 0, medium: 0, hard: 0, total: 0 })
    : (diffMap[selectedPlatform] ?? { easy: 0, medium: 0, hard: 0, total: 0 });

  // Arc lengths must be proportional to easy + medium + hard — not d.total.
  // solved_count can exceed tagged difficulties when some problems lack tags.
  const segmentTotal: number = d.easy + d.medium + d.hard;

  const donutSegments = useMemo(() => {
    const items = DIFFICULTY_ITEMS.map((item) => ({
      key: item.key,
      value: d[item.key],
      color: item.color,
    }));

    if (segmentTotal === 0) {
      return items.map((item) => ({ ...item, dashLen: 0, offset: 0 }));
    }

    let offset = 0;

    return items.map((item, index) => {
      const isLast = index === items.length - 1;
      const dashLen = isLast
        ? DONUT_CIRCUMFERENCE - offset
        : (item.value / segmentTotal) * DONUT_CIRCUMFERENCE;
      const segment = { ...item, dashLen, offset };
      offset += dashLen;
      return segment;
    });
  }, [d.easy, d.medium, d.hard, segmentTotal]);

  /** Hover on a platform pill to filter difficulty. Hover away to reset. */
  function handlePlatformHover(platformName: string): void {
    setSelectedPlatform(platformName.toLowerCase());
  }

  function handlePlatformHoverEnd(): void {
    setSelectedPlatform(null);
  }

  const chartDescription = `${selectedPlatform ?? "All platforms"}: ${d.total} solved — ${d.easy} easy, ${d.medium} medium, ${d.hard} hard`;

  return (
    <div className="card-quiet rounded-xl p-5 lg:p-6 flex flex-col lg:flex-row gap-0 h-full">
      {/* ── Left 1/3: Donut Chart ── */}
      <div className="lg:w-1/3 flex flex-col items-center justify-center py-4 lg:py-0 lg:border-r lg:pr-5" style={{ borderColor: "var(--dash-border-subtle)" }}>
        <div className="flex items-center gap-2 mb-4 self-start lg:self-center">
          <h4
            className="tracking-[0.12em] font-medium uppercase text-[color:var(--dash-content-tertiary)]"
            style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-caption)" }}
          >
            Stats Overview
          </h4>
          {selectedPlatform && (
            <span
              className="font-bold px-2 py-0.5 rounded capitalize text-[color:var(--dash-content-secondary)]"
              style={{ background: "var(--dash-surface-sunken)", fontSize: "var(--dash-text-caption)" }}
            >
              {selectedPlatform}
            </span>
          )}
        </div>
        <div
          className="relative w-36 h-36 lg:w-44 lg:h-44 flex items-center justify-center flex-shrink-0"
          role="img"
          aria-label={chartDescription}
        >
          <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r={DONUT_RADIUS}
              fill="none"
              stroke="var(--dash-surface-sunken)"
              strokeWidth={DONUT_STROKE}
            />
            {donutSegments.map((segment, index) => (
              <circle
                key={segment.key}
                cx="50"
                cy="50"
                r={DONUT_RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={DONUT_STROKE}
                strokeLinecap="butt"
                strokeDasharray={
                  animated
                    ? `${segment.dashLen} ${DONUT_CIRCUMFERENCE - segment.dashLen}`
                    : `0 ${DONUT_CIRCUMFERENCE}`
                }
                strokeDashoffset={-segment.offset}
                className="transition-all duration-1000 ease-out"
                style={{ transitionDelay: `${index * 150}ms` }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-bold text-[color:var(--dash-content-primary)]" style={{ fontFamily: "var(--font-geist-sans)", fontSize: "var(--dash-text-value-lg)" }}>{d.total}</span>
            <span className="uppercase tracking-wider text-[color:var(--dash-content-tertiary)]" style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-tick)" }}>Solved</span>
          </div>
        </div>
      </div>

      {/* ── Right 2/3 ── */}
      <div className="lg:w-2/3 lg:pl-5 flex flex-col justify-between min-h-0">
        {/* Top half: Difficulty labels */}
        <div className="flex-1 flex flex-col justify-center py-2 lg:py-0">
          <div className="space-y-3">
            {DIFFICULTY_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[color:var(--dash-content-secondary)]" style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-body)" }}>
                    {item.label}
                  </span>
                </div>
                <span className="font-semibold text-[color:var(--dash-content-primary)]" style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-value-sm)" }}>
                  {d[item.key]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider — only show when there are platform pills */}
        {pills.length > 0 && <div className="h-px my-3" style={{ background: "var(--dash-border-subtle)" }} />}

        {/* Bottom half: Platform pills (hover to filter difficulty) */}
        {pills.length > 0 && (
          <div className="flex-1 flex flex-col justify-center py-2 lg:py-0">
            <div className="flex gap-2">
              {pills.map((p) => {
                const platformKey: string = p.name.toLowerCase();
                const isActive: boolean = selectedPlatform === platformKey;
                const colors = PLATFORM_COLORS[p.colorKey] ?? PLATFORM_COLORS.primary;
                const activeColors = PLATFORM_ACTIVE_COLORS[p.colorKey] ?? PLATFORM_ACTIVE_COLORS.primary;

                return (
                  <button
                    type="button"
                    key={p.name}
                    className={`flex-1 flex flex-col items-center justify-center rounded-lg py-3 px-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${isActive ? "ring-1 ring-white/20" : ""}`}
                    style={{
                      background: isActive ? activeColors.bg : colors.bg,
                      border: `1px solid ${isActive ? activeColors.border : colors.border}`,
                    }}
                    onMouseEnter={() => handlePlatformHover(p.name)}
                    onMouseLeave={handlePlatformHoverEnd}
                    onFocus={() => handlePlatformHover(p.name)}
                    onBlur={handlePlatformHoverEnd}
                    aria-pressed={isActive}
                  >
                    <span
                      className="font-medium tracking-wide capitalize"
                      style={{ color: colors.text, fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-tick)" }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="font-bold mt-1 text-[color:var(--dash-content-primary)]"
                      style={{ fontFamily: "var(--font-geist-sans)", fontSize: "var(--dash-text-value)" }}
                    >
                      {p.solvedCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
