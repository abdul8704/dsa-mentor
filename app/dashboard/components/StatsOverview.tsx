"use client";

import { useEffect, useState } from "react";
import type { DifficultyStats, PlatformStat } from "@/app/lib/types/analytics";

interface StatsOverviewProps {
  difficulty?: DifficultyStats | null;
  platforms?: PlatformStat[] | null;
}

const DEFAULT_DIFFICULTY: DifficultyStats = {
  easy: 342,
  medium: 412,
  hard: 88,
  total: 842,
};

const DEFAULT_PLATFORMS: PlatformStat[] = [
  { platform: "LeetCode", icon: "code", solvedCount: 20, rating: 2100, maxRating: 2200, subtitle: "Global Rank: #4k", color: "primary" },
  { platform: "AtCoder", icon: "terminal", solvedCount: 34, rating: 1820, maxRating: 1900, subtitle: "1820 Rated", color: "tertiary" },
  { platform: "Codeforces", icon: "public", solvedCount: 56, rating: 1650, maxRating: 1700, subtitle: "Expert Level", color: "secondary" },
];

const PLATFORM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  primary: { bg: "rgba(244,113,68,0.08)", border: "rgba(244,113,68,0.2)", text: "#ffb59d" },
  tertiary: { bg: "rgba(78,222,163,0.08)", border: "rgba(78,222,163,0.2)", text: "#4edea3" },
  secondary: { bg: "rgba(200,198,201,0.08)", border: "rgba(200,198,201,0.2)", text: "#c8c6c9" },
};

const DIFFICULTY_ITEMS = [
  { key: "easy" as const, label: "Easy", color: "#6ffbbe", dotClass: "bg-[#6ffbbe]" },
  { key: "medium" as const, label: "Medium", color: "#ffb700", dotClass: "bg-[#ffb700]" },
  { key: "hard" as const, label: "Hard", color: "#f63737", dotClass: "bg-[#f63737]" },
];
// "#f47144", "#4edea3", "#6ffbbe", "#93000a"
export default function StatsOverview({ difficulty, platforms }: StatsOverviewProps) {
  const d = difficulty ?? DEFAULT_DIFFICULTY;
  const plats = platforms ?? DEFAULT_PLATFORMS;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const total = d.total || 1;
  const easyPct = (d.easy / total) * 100;
  const mediumPct = (d.medium / total) * 100;
  const hardPct = (d.hard / total) * 100;

  return (
    <div className="glass-card rounded-xl p-5 lg:p-6 flex flex-col lg:flex-row gap-0 h-full">
      {/* ── Left 1/3: Donut Chart ── */}
      <div className="lg:w-1/3 flex flex-col items-center justify-center py-4 lg:py-0 lg:border-r lg:border-white/5 lg:pr-5">
        <h4
          className="text-xs tracking-[0.12em] font-medium uppercase text-[#a78b82] mb-4 self-start lg:self-center"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          Difficulty
        </h4>
        <div className="relative w-45 h-45 lg:w-45 lg:h-45 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
            {/* Background track ring */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="13" />
            {(() => {
              const circ = 2 * Math.PI * 35;
              const easyLen = (easyPct / 100) * circ;
              const medLen = (mediumPct / 100) * circ;
              const hardLen = (hardPct / 100) * circ;
              return (
                <>
                  <circle
                    cx="50" cy="50" r="35" fill="none"
                    stroke="#6ffbbe" strokeWidth="12" strokeLinecap="butt"
                    strokeDasharray={animated ? `${easyLen} ${circ - easyLen}` : `0 ${circ}`}
                    strokeDashoffset="0"
                    className="transition-all duration-1000 ease-out"
                  />
                  <circle
                    cx="50" cy="50" r="35" fill="none"
                    stroke="#ffb700" strokeWidth="12" strokeLinecap="butt"
                    strokeDasharray={animated ? `${medLen} ${circ - medLen}` : `0 ${circ}`}
                    strokeDashoffset={-easyLen}
                    className="transition-all duration-1000 ease-out delay-200"
                  />
                  <circle
                    cx="50" cy="50" r="35" fill="none"
                    stroke="#f63737" strokeWidth="12" strokeLinecap="butt"
                    strokeDasharray={animated ? `${hardLen} ${circ - hardLen}` : `0 ${circ}`}
                    strokeDashoffset={-(easyLen + medLen)}
                    className="transition-all duration-1000 ease-out delay-300"
                  />
                </>
              );
            })()}
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
                  <span
                    className="text-[13px] text-[#dfc0b6]"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {item.label}
                  </span>
                </div>
                <span
                  className="text-[14px] font-semibold text-[#e5e1e4]"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  {d[item.key]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 my-3" />

        {/* Bottom half: Platform pills */}
        <div className="flex-1 flex flex-col justify-center py-2 lg:py-0">
          <div className="flex gap-2">
            {plats.map((p) => {
              const colors = PLATFORM_COLORS[p.color] ?? PLATFORM_COLORS.primary;
              return (
                <div
                  key={p.platform}
                  className="flex-1 flex flex-col items-center justify-center rounded-lg py-3 px-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.bg.replace("0.08", "0.18");
                    e.currentTarget.style.borderColor = colors.border.replace("0.2", "0.45");
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.bg;
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  <span
                    className="text-[11px] font-medium tracking-wide"
                    style={{ color: colors.text, fontFamily: "var(--font-geist-mono)" }}
                  >
                    {p.platform}
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
      </div>
    </div>
  );
}
