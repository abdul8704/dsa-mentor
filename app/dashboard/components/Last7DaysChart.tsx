"use client";

import { useEffect, useState } from "react";

// Single-letter initials indexed by JS getDay() (0 = Sunday … 6 = Saturday).
const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
// Ordered top → bottom to match the Y-axis label column.
const GRID_FRACTIONS = [1, 0.5, 0] as const;
const MONO = "var(--font-geist-mono)";

/**
 * Compact line chart of the last 7 days of solved-problem counts.
 * Shared between the personal dashboard (StreakStatsClient) and the mentor's
 * mentee roster table so both surfaces render the identical graph.
 *
 * All text (axis values, weekday labels, the hover tooltip) is real HTML
 * layered over the plot, not SVG <text>. The SVG itself uses
 * preserveAspectRatio="none" so the line/area fill stretch to fill whatever
 * box they're given — but doing that to <text> as well non-uniformly
 * scales the glyphs and makes labels unreadable, which is what was
 * happening before. Keeping text out of the stretched coordinate system
 * keeps it crisp at any container size.
 */
export default function Last7DaysChart({ breakdown }: { breakdown: number[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // The breakdown maps index 0 → (breakdown.length - 1) days ago and the last
  // index → today, so each bar's weekday label must be derived from the real
  // calendar rather than a fixed Mon–Sun list. Compute after mount to keep
  // the label consistent with the viewer's local date (and avoid a
  // server/client hydration mismatch near midnight/timezone boundaries).
  const [dayLabels, setDayLabels] = useState<string[]>(() => Array(breakdown.length).fill(""));
  useEffect(() => {
    const labels = breakdown.map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (breakdown.length - 1 - index));
      return WEEKDAY_INITIALS[date.getDay()];
    });
    setDayLabels(labels);
  }, [breakdown.length]);

  const maxVal = Math.max(...breakdown, 1);
  const padY = 8;
  const chartH = 100 - padY * 2;

  // Coordinates live in a 0–100 percentage space on both axes, so they can
  // drive the SVG viewBox *and* the HTML tooltip position with the same math.
  const points = breakdown.map((value, index) => ({
    x: (index / Math.max(breakdown.length - 1, 1)) * 100,
    y: padY + chartH - (value / maxVal) * chartH,
    value,
  }));

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const fillPath = `${linePath} L${points[points.length - 1].x},100 L${points[0].x},100 Z`;

  const chartDescription = `Problems solved, last 7 days: ${points
    .map((p, i) => `${dayLabels[i] || `day ${i + 1}`} ${p.value}`)
    .join(", ")}`;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex gap-2 min-h-0" role="img" aria-label={chartDescription}>
        {/* Y-axis labels — real HTML, positioned to match the SVG's 0–100 space */}
        <div className="relative w-6 shrink-0" aria-hidden="true">
          {GRID_FRACTIONS.map((fraction) => (
            <span
              key={fraction}
              className="absolute right-0 -translate-y-1/2 leading-none text-[color:var(--dash-content-tertiary)]"
              style={{ top: `${padY + chartH * (1 - fraction)}%`, fontFamily: MONO, fontSize: "var(--dash-text-caption)" }}
            >
              {Math.round(maxVal * fraction)}
            </span>
          ))}
        </div>

        {/* Plot area */}
        <div className="flex-1 relative">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full block"
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredIndex(null)}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--dash-feedback-success)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--dash-feedback-success)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {GRID_FRACTIONS.map((fraction) => {
              const y = padY + chartH * (1 - fraction);
              return <line key={fraction} x1="0" x2="100" y1={y} y2={y} stroke="white" strokeOpacity="0.05" />;
            })}

            <path d={fillPath} fill="url(#lc-fill)" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--dash-feedback-success)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4.5"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hoveredIndex === index ? 2.4 : 1.6}
                  fill="var(--dash-feedback-success)"
                  stroke="var(--dash-surface-base)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  className="transition-all duration-150"
                />
              </g>
            ))}
          </svg>

          {/* Hover tooltip — HTML, so the number never gets stretched */}
          {hoveredIndex !== null && (
            <div
              className="absolute -translate-x-1/2 -translate-y-full pointer-events-none whitespace-nowrap rounded-md border px-1.5 py-0.5 font-semibold"
              style={{
                left: `${points[hoveredIndex].x}%`,
                top: `${Math.max(points[hoveredIndex].y - 8, 0)}%`,
                background: "rgba(19,19,21,0.92)",
                borderColor: "color-mix(in srgb, var(--dash-feedback-success) 35%, transparent)",
                color: "var(--dash-feedback-success)",
                fontFamily: MONO,
                fontSize: "var(--dash-text-tick)",
              }}
            >
              {points[hoveredIndex].value}
            </div>
          )}
        </div>
      </div>

      {/* X-axis weekday labels */}
      <div className="flex mt-1.5 pl-6" aria-hidden="true">
        {points.map((point, index) => (
          <span
            key={index}
            className="flex-1 text-center leading-none text-[color:var(--dash-content-tertiary)]"
            style={{ fontFamily: MONO, fontSize: "var(--dash-text-caption)" }}
          >
            {dayLabels[index]}
          </span>
        ))}
      </div>
    </div>
  );
}
