"use client";

import type { PlatformStat } from "@/app/lib/types/analytics";

interface PlatformStatsClientProps {
  data?: PlatformStat[] | null;
}

const DEFAULT_DATA: PlatformStat[] = [
  { platform: "LeetCode", icon: "code", solvedCount: 20, rating: 2100, maxRating: 2200, subtitle: "Global Rank: #4k", color: "primary" },
  { platform: "AtCoder", icon: "terminal", solvedCount: 34, rating: 1820, maxRating: 1900, subtitle: "1820 Rated", color: "tertiary" },
  { platform: "Codeforces", icon: "public", solvedCount: 56, rating: 1650, maxRating: 1700, subtitle: "Expert Level", color: "secondary" },
];

const COLOR_MAP = {
  primary: { text: "text-[#ffb59d]", bg: "bg-[rgba(244,113,68,0.1)]" },
  tertiary: { text: "text-[#4edea3]", bg: "bg-[rgba(78,222,163,0.1)]" },
  secondary: { text: "text-[#c8c6c9]", bg: "bg-[rgba(200,198,201,0.1)]" },
};

export default function PlatformStatsClient({ data }: PlatformStatsClientProps) {
  const platforms = data ?? DEFAULT_DATA;

  return (
    <div className="glass-card rounded-xl p-5 lg:p-6">
      <h4 className="text-[12px] tracking-[0.05em] font-medium uppercase text-[#dfc0b6] mb-6" style={{ fontFamily: "var(--font-geist-mono)" }}>
        Platforms
      </h4>
      <div className="space-y-6">
        {platforms.map((p) => {
          const colors = COLOR_MAP[p.color] ?? COLOR_MAP.primary;
          return (
            <div key={p.platform} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                  <span className={`material-symbols-outlined ${colors.text} text-lg`}>{p.icon}</span>
                </div>
                <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-geist-sans)" }}>{p.platform}</span>
              </div>
              <div className="text-right">
                <span className={`block text-lg font-semibold ${colors.text}`} style={{ fontFamily: "var(--font-geist-sans)" }}>
                  {p.solvedCount}
                </span>
                <span className="text-[10px] text-[#dfc0b6] uppercase">{p.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
