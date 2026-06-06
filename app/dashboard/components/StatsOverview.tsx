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
  primary: { bg: "rgba(244,113,68,0.08)", border: "rgba(244,113,68,0.2)", text: "#ffb59d" },
  tertiary: { bg: "rgba(78,222,163,0.08)", border: "rgba(78,222,163,0.2)", text: "#4edea3" },
  secondary: { bg: "rgba(200,198,201,0.08)", border: "rgba(200,198,201,0.2)", text: "#c8c6c9" },
};

/** Active (selected) platform pill styles */
const PLATFORM_ACTIVE_COLORS: Record<string, { bg: string; border: string }> = {
  primary: { bg: "rgba(244,113,68,0.22)", border: "rgba(244,113,68,0.55)" },
  tertiary: { bg: "rgba(78,222,163,0.22)", border: "rgba(78,222,163,0.55)" },
  secondary: { bg: "rgba(200,198,201,0.22)", border: "rgba(200,198,201,0.55)" },
};

/** Map platform names → color keys for UI styling */
const PLATFORM_COLOR_MAP: Record<string, "primary" | "tertiary" | "secondary"> = {
  leetcode: "primary",
  atcoder: "tertiary",
  codeforces: "secondary",
};

const DIFFICULTY_ITEMS = [
  { key: "easy" as const, label: "Easy", color: "#6ffbbe", dotClass: "bg-[#6ffbbe]" },
  { key: "medium" as const, label: "Medium", color: "#ffb700", dotClass: "bg-[#ffb700]" },
  { key: "hard" as const, label: "Hard", color: "#f63737", dotClass: "bg-[#f63737]" },
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

  return (
    <div className="glass-card rounded-xl p-5 lg:p-6 flex flex-col lg:flex-row gap-0 h-full">
      {/* ── Left 1/3: Donut Chart ── */}
      <div className="lg:w-1/3 flex flex-col items-center justify-center py-4 lg:py-0 lg:border-r lg:border-white/5 lg:pr-5">
        <div className="flex items-center gap-2 mb-4 self-start lg:self-center">
          <h4
            className="text-xs tracking-[0.12em] font-medium uppercase text-[#a78b82]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Difficulty
          </h4>
          {selectedPlatform && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-[#dfc0b6] capitalize">
              {selectedPlatform}
            </span>
          )}
        </div>
        <div className="relative w-36 h-36 lg:w-44 lg:h-44 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={DONUT_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
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
            <span className="text-3xl font-bold text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-sans)" }}>{d.total}</span>
            <span className="text-[10px] uppercase text-[#a78b82] tracking-wider" style={{ fontFamily: "var(--font-geist-mono)" }}>Solved</span>
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
                  <div className={`w-2 h-2 rounded-full ${item.dotClass}`} />
                  <span className="text-[13px] text-[#dfc0b6]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                    {item.label}
                  </span>
                </div>
                <span className="text-[14px] font-semibold text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                  {d[item.key]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider — only show when there are platform pills */}
        {pills.length > 0 && <div className="h-px bg-white/5 my-3" />}

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
                  <div
                    key={p.name}
                    className={`flex-1 flex flex-col items-center justify-center rounded-lg py-3 px-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${isActive ? "ring-1 ring-white/20" : ""}`}
                    style={{
                      background: isActive ? activeColors.bg : colors.bg,
                      border: `1px solid ${isActive ? activeColors.border : colors.border}`,
                    }}
                    onMouseEnter={() => handlePlatformHover(p.name)}
                    onMouseLeave={handlePlatformHoverEnd}
                  >
                    <span
                      className="text-[11px] font-medium tracking-wide capitalize"
                      style={{ color: colors.text, fontFamily: "var(--font-geist-mono)" }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="text-[20px] font-bold mt-1 text-[#e5e1e4]"
                      style={{ fontFamily: "var(--font-geist-sans)" }}
                    >
                      {p.solvedCount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
