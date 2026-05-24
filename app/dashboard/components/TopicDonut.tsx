"use client";

import { useEffect, useState } from "react";
import type { TopicBreakdownData, TopicStat } from "@/app/lib/types/analytics";

interface TopicDonutProps {
  data?: TopicBreakdownData | null;
}

const DEFAULT_DATA: { accuracy: number; allTime: TopicStat[] } = {
  accuracy: 78,
  allTime: [
    { topic: "Graphs", percentage: 42, problemCount: 354, trend: 5 },
    { topic: "Trees", percentage: 28, problemCount: 236, trend: 3 },
    { topic: "DP", percentage: 18, problemCount: 152, trend: -2 },
    { topic: "Math", percentage: 12, problemCount: 100, trend: 1 },
  ],
};

const TOPIC_COLORS = ["#f47144", "#4edea3", "#6ffbbe", "#93000a"];
const TOPIC_TEXT_COLORS = ["text-[#ffb59d]", "text-[#4edea3]", "text-[#6ffbbe]", "text-[#ffb4ab]"];

export default function TopicDonut({ data }: TopicDonutProps) {
  const accuracy = data?.accuracy ?? DEFAULT_DATA.accuracy;
  const topics = data?.allTime ?? DEFAULT_DATA.allTime;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Build donut segments
  const circumference = 2 * Math.PI * 39; // ~257.6
  let offset = 0;
  const segments = topics.map((t, i) => {
    const dashLen = (t.percentage / 100) * circumference;
    const seg = { ...t, dashLen, offset, color: TOPIC_COLORS[i % TOPIC_COLORS.length] };
    offset += dashLen;
    return seg;
  });

  return (
    <div className="glass-card rounded-xl p-6 lg:p-8">
      <h4 className="text-[12px] tracking-[0.05em] font-medium uppercase text-[#dfc0b6] mb-8" style={{ fontFamily: "var(--font-geist-mono)" }}>
        All Time Topic Breakdown
      </h4>
      <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-12">
        {/* Donut */}
        <div className="w-40 h-40 lg:w-48 lg:h-48 relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-[12px] border-white/5" />
          <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-geist-sans)" }}>{accuracy}%</span>
            <span className="text-[10px] uppercase text-[#dfc0b6]" style={{ fontFamily: "var(--font-geist-mono)" }}>Accuracy</span>
          </div>
        </div>

        {/* Topic Cards */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          {topics.map((t, i) => (
            <div key={t.topic} className="p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] text-[#dfc0b6] uppercase block">{t.topic}</span>
              <span className={`text-xl font-semibold ${TOPIC_TEXT_COLORS[i % TOPIC_TEXT_COLORS.length]}`} style={{ fontFamily: "var(--font-geist-sans)" }}>
                {t.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
