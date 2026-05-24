"use client";

import type { StreakData } from "@/app/lib/types/analytics";

interface StreakStatsClientProps {
  streak?: StreakData | null;
}

const DEFAULT_STREAK: StreakData = {
  currentStreak: 124,
  longestStreak: 218,
  solvedToday: 14,
  last7DaysSolved: 47,
  last7DaysChange: 12,
  last7DaysBreakdown: [4, 6, 8, 7, 9, 6, 7],
  solvedThisMonth: 89,
  solvedPrev30Days: 72,
  contestsThisWeek: 3,
};

/** Decorative flame icon using Material Symbols */
function FlameIcon() {
  return (
    <div className="relative flex-shrink-0 w-12 h-12 flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-40"
        style={{
          background: "radial-gradient(circle, rgba(244,113,68,0.6) 0%, transparent 70%)",
        }}
      />
      <span
        className="material-symbols-outlined relative"
        style={{
          fontSize: "40px",
          color: "#f47144",
          fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48",
          filter: "drop-shadow(0 2px 8px rgba(244,113,68,0.3))",
        }}
      >
        local_fire_department
      </span>
    </div>
  );
}

interface MiniCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}

function MiniCard({ icon, label, value, sub, accent }: MiniCardProps) {
  return (
    <div className="glass-card rounded-xl px-5 py-4 flex items-center justify-center gap-3.5 group h-full">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ background: `${accent}15` }}
      >
        <span className="material-symbols-outlined text-xl" style={{ color: accent }}>
          {icon}
        </span>
      </div>
      <div className="flex flex-col min-w-0">
        <span
          className="text-xs tracking-widest font-medium uppercase text-[#a78b82] leading-tight"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {label}
        </span>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span
            className="text-2xl font-bold leading-none tracking-tight"
            style={{ fontFamily: "var(--font-geist-sans)", color: accent }}
          >
            {value}
          </span>
          {sub && (
            <span className="text-xs text-[#a78b82] uppercase">{sub}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StreakStatsClient({ streak }: StreakStatsClientProps) {
  const s = streak ?? DEFAULT_STREAK;
  const changeUp = s.last7DaysChange >= 0;
  const contestsTotal = 7;

  return (
    <div className="grid grid-cols-5 gap-3 h-full">
      {/* 1. Longest Streak — with flame icon */}
      <div
        className="col-span-2 glass-card rounded-xl px-5 py-4 flex items-center justify-center gap-4"
        style={{ background: "linear-gradient(135deg, rgba(24,24,27,0.7) 0%, rgba(30,22,18,0.6) 100%)" }}
      >
        <FlameIcon />
        <div className="flex flex-col min-w-0">
          <span
            className="text-xs tracking-widest font-medium uppercase text-[#a78b82] leading-tight"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Longest Streak
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              className="text-2xl font-bold leading-none tracking-tight text-[#e5e1e4]"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              {s.longestStreak}
            </span>
            <span className="text-xs text-[#a78b82] uppercase">days</span>
          </div>
        </div>
      </div>

      {/* 2. Last 7 Days — narrow text + wide line chart */}
      <div className="col-span-3 glass-card rounded-xl px-4 py-3.5 flex items-stretch gap-0 overflow-hidden">
        {/* Left ~30%: labels */}
        <div className="w-[30%] flex flex-col justify-center pr-1 border-r border-white/5">
          <span
            className="text-xs tracking-widest font-medium uppercase text-[#a78b82] leading-tight"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Last 7 Days
          </span>
          <span
            className="text-2xl font-bold leading-none tracking-tight text-[#4edea3] mt-1"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            {s.last7DaysSolved}
          </span>
          <span
            className={`mt-1 inline-flex items-center gap-0.5 text-xs font-semibold ${
              changeUp ? "text-[#4edea3]" : "text-[#ffb4ab]"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "0.75rem" }}>
              {changeUp ? "arrow_upward" : "arrow_downward"}
            </span>
            {Math.abs(s.last7DaysChange)}%
          </span>
        </div>

        {/* Right ~70%: Line chart */}
        <div className="w-[70%] pl-3 flex flex-col justify-center">
          <svg viewBox="0 0 120 50" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4edea3" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4edea3" stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const maxVal = Math.max(...s.last7DaysBreakdown, 1);
              const padY = 6;
              const chartH = 50 - padY * 2;
              const points = s.last7DaysBreakdown.map((v, i) => ({
                x: (i / 6) * 114 + 3,
                y: padY + chartH - (v / maxVal) * chartH,
              }));
              const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
              const fillPath = `${linePath} L${points[points.length - 1].x},${50} L${points[0].x},${50} Z`;
              const days = ["M", "T", "W", "T", "F", "S", "S"];
              return (
                <>
                  {[0.25, 0.5, 0.75].map((f) => (
                    <line key={f} x1="3" x2="117" y1={padY + chartH * (1 - f)} y2={padY + chartH * (1 - f)} stroke="white" strokeOpacity="0.04" />
                  ))}
                  <path d={fillPath} fill="url(#lc-fill)" />
                  <path d={linePath} fill="none" stroke="#4edea3" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                  {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2" fill="#4edea3" stroke="#131315" strokeWidth="1" />
                  ))}
                  {points.map((p, i) => (
                    <text key={`d${i}`} x={p.x} y={50} textAnchor="middle" fill="#a78b82" fontSize="5" fontFamily="var(--font-geist-mono)">
                      {days[i]}
                    </text>
                  ))}
                </>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Bottom row: equal width */}
      <div className="col-span-5 grid grid-cols-2 gap-3">
        {/* 3. Last 30 Days Solved */}
        <div className="glass-card rounded-xl px-5 py-4 flex items-center justify-center gap-3.5 group h-full">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ background: "rgba(255,181,157,0.08)" }}
          >
            <span className="material-symbols-outlined text-xl" style={{ color: "#ffb59d" }}>
              calendar_month
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="text-xs tracking-widest font-medium uppercase text-[#a78b82] leading-tight"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              Last 30 Days
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className="text-2xl font-bold leading-none tracking-tight text-[#ffb59d]"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                {s.solvedThisMonth}
              </span>
              {/* Previous 30d count + %diff as subscript */}
              {(() => {
                const prev = s.solvedPrev30Days || 1;
                const diff = Math.round(((s.solvedThisMonth - prev) / prev) * 100);
                const up = diff >= 0;
                return (
                  <span className="flex items-center gap-0.5">
                    <span className="text-[10px] text-[#a78b82]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                      {prev}
                    </span>
                    <span
                      className={`inline-flex items-center gap-px text-[10px] font-semibold ${
                        up ? "text-[#4edea3]" : "text-[#ffb4ab]"
                      }`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "10px" }}>
                        {up ? "arrow_upward" : "arrow_downward"}
                      </span>
                      {Math.abs(diff)}%
                    </span>
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 4. Contests Attended */}
        <div className="glass-card rounded-xl px-5 py-4 flex items-center justify-center gap-3.5 group h-full">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ background: "rgba(200,172,255,0.08)" }}
          >
            <span className="material-symbols-outlined text-xl" style={{ color: "#c8acff" }}>
              emoji_events
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="text-xs tracking-widest font-medium uppercase text-[#a78b82] leading-tight"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              Contests Attended
            </span>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span
                className="text-xl font-bold leading-none tracking-tight text-[#c8acff]"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                {s.contestsThisWeek}
              </span>
              <span
                className="text-xs text-[#a78b82] font-medium"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                /{contestsTotal}
              </span>
              <span className="text-[10px] text-[#a78b82] uppercase ml-1">last 7 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
