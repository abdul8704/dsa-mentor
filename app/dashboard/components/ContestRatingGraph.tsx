"use client";

import { useState, useMemo } from "react";
import type { ContestRatingData } from "@/app/lib/types/analytics";

interface ContestRatingGraphProps {
  data?: ContestRatingData | null;
}

const DEFAULT_DATA: ContestRatingData = {
  current: 2382,
  peak: 2410,
  momChange: 142,
  totalContests: 18,
  percentile: "TOP 2.1%",
  history: [
    { date: "2025-01", rating: 1800, contestId: "c1" },
    { date: "2025-02", rating: 1950, contestId: "c2" },
    { date: "2025-03", rating: 1900, contestId: "c3" },
    { date: "2025-04", rating: 2100, contestId: "c4" },
    { date: "2025-05", rating: 2050, contestId: "c5" },
    { date: "2025-06", rating: 2200, contestId: "c6" },
    { date: "2025-07", rating: 2150, contestId: "c7" },
    { date: "2025-08", rating: 2300, contestId: "c8" },
    { date: "2025-09", rating: 2250, contestId: "c9" },
    { date: "2025-10", rating: 2350, contestId: "c10" },
    { date: "2025-11", rating: 2382, contestId: "c11" },
    { date: "2025-12", rating: 2410, contestId: "c12" },
  ],
};

export default function ContestRatingGraph({ data }: ContestRatingGraphProps) {
  const d = data ?? DEFAULT_DATA;
  const [hovered, setHovered] = useState(false);

  // Generate SVG path from rating data
  const pathData = useMemo(() => {
    if (d.history.length === 0) return "";
    const minR = Math.min(...d.history.map((h) => h.rating));
    const maxR = Math.max(...d.history.map((h) => h.rating));
    const range = maxR - minR || 1;
    const padding = 2;
    const chartH = 40 - padding * 2;
    const chartW = 100;

    const points = d.history.map((h, i) => {
      const x = (i / (d.history.length - 1)) * chartW;
      const y = padding + chartH - ((h.rating - minR) / range) * chartH;
      return `${x},${y}`;
    });

    return `M${points.join(" L")}`;
  }, [d.history]);

  return (
    <div className="glass-card rounded-xl p-5 lg:p-6">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-[12px] tracking-[0.05em] font-medium uppercase text-[#dfc0b6]" style={{ fontFamily: "var(--font-geist-mono)" }}>
          Contest Rating
        </h4>
        <span className="px-2 py-0.5 bg-[rgba(244,113,68,0.1)] text-[#ffb59d] text-[10px] font-bold rounded">
          {d.percentile}
        </span>
      </div>

      {/* Chart */}
      <div
        className="h-32 w-full relative group cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40">
          <defs>
            <linearGradient id="grad-line" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#f47144" />
              <stop offset="100%" stopColor="#ffb59d" />
            </linearGradient>
          </defs>
          {/* Grid Lines */}
          {[10, 20, 30].map((y) => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="white" strokeOpacity="0.05" strokeDasharray="1" />
          ))}
          {/* Main Line */}
          <path d={pathData} fill="none" stroke="url(#grad-line)" strokeWidth="2" className="transition-all duration-500" />
        </svg>

        {/* Hover Overlay */}
        {hovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(19,19,21,0.2)] backdrop-blur-[2px] transition-opacity">
            <span className="text-xs bg-[#201f22] rounded-lg px-3 py-1 border border-white/10 shadow-xl" style={{ fontFamily: "var(--font-geist-mono)" }}>
              Rating Peak: {d.peak.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex justify-between mt-4">
        <div className="text-center">
          <span className="block text-sm text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-mono)" }}>
            {d.current.toLocaleString()}
          </span>
          <span className="text-[9px] text-[#dfc0b6] uppercase">Current</span>
        </div>
        <div className="text-center">
          <span className="block text-sm text-[#4edea3]" style={{ fontFamily: "var(--font-geist-mono)" }}>
            +{d.momChange}
          </span>
          <span className="text-[9px] text-[#dfc0b6] uppercase">MoM Change</span>
        </div>
        <div className="text-center">
          <span className="block text-sm text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-mono)" }}>
            {d.totalContests}
          </span>
          <span className="text-[9px] text-[#dfc0b6] uppercase">Contests</span>
        </div>
      </div>
    </div>
  );
}
