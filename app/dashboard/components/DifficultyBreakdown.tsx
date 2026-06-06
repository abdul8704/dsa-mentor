"use client";

import { useEffect, useState } from "react";
import type { DifficultyStats } from "@/app/lib/types/analytics";

interface DifficultyBreakdownProps {
  data?: DifficultyStats | null;
}

const DEFAULT_DATA: DifficultyStats = {
  easy: 342,
  medium: 412,
  hard: 88,
  total: 842,
};

export default function DifficultyBreakdown({ data }: DifficultyBreakdownProps) {
  const d = data ?? DEFAULT_DATA;
  console.log(data)
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const total = d.total || 1;
  const circumference = 2 * Math.PI * 16; // r=16
  const easyPct = (d.easy / total) * 100;
  const mediumPct = (d.medium / total) * 100;
  const hardPct = (d.hard / total) * 100;

  return (
    <div className="glass-card rounded-xl p-5 lg:p-6">
      <h4 className="text-[12px] tracking-[0.05em] font-medium uppercase text-[#dfc0b6] mb-6" style={{ fontFamily: "var(--font-geist-mono)" }}>
         Breakdown
      </h4>
      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-28 h-28 lg:w-32 lg:h-32 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            {/* Background */}
            <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            {/* Easy */}
            <circle
              cx="18" cy="18" r="16" fill="none"
              stroke="#4edea3" strokeWidth="3"
              strokeDasharray={animated ? `${easyPct} ${100 - easyPct}` : "0 100"}
              strokeDashoffset="0"
              className="transition-all duration-1000 ease-out"
            />
            {/* Medium */}
            <circle
              cx="18" cy="18" r="16" fill="none"
              stroke="#f47144" strokeWidth="3"
              strokeDasharray={animated ? `${mediumPct} ${100 - mediumPct}` : "0 100"}
              strokeDashoffset={`-${easyPct}`}
              className="transition-all duration-1000 ease-out delay-200"
            />
            {/* Hard */}
            <circle
              cx="18" cy="18" r="16" fill="none"
              stroke="#93000a" strokeWidth="3"
              strokeDasharray={animated ? `${hardPct} ${100 - hardPct}` : "0 100"}
              strokeDashoffset={`-${easyPct + mediumPct}`}
              className="transition-all duration-1000 ease-out delay-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-geist-sans)" }}>{d.total}</span>
            <span className="text-[9px] uppercase opacity-50">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {[
            { label: "Easy", count: d.easy, color: "bg-[#4edea3]" },
            { label: "Medium", count: d.medium, color: "bg-[#f47144]" },
            { label: "Hard", count: d.hard, color: "bg-[#ffb4ab]" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-sm" style={{ fontFamily: "var(--font-geist-mono)" }}>{item.label}</span>
              </div>
              <span className="text-[14px]" style={{ fontFamily: "var(--font-geist-mono)" }}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
