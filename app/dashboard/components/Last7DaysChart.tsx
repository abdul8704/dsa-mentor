"use client";

import { useState } from "react";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const GRID_FRACTIONS = [0.25, 0.5, 0.75] as const;

/**
 * Compact SVG line chart of the last 7 days of solved-problem counts.
 * Shared between the personal dashboard (StreakStatsClient) and the mentor's
 * mentee roster table so both surfaces render the identical graph.
 */
export default function Last7DaysChart({ breakdown }: { breakdown: number[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxVal = Math.max(...breakdown, 1);
  const padY = 6;
  const padLeft = 12;
  const chartRight = 117;
  const chartWidth = chartRight - padLeft;
  const chartH = 50 - padY * 2;

  const points = breakdown.map((value, index) => ({
    x: padLeft + (index / 6) * chartWidth,
    y: padY + chartH - (value / maxVal) * chartH,
    value,
  }));

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const fillPath = `${linePath} L${points[points.length - 1].x},${50} L${points[0].x},${50} Z`;

  return (
    <svg
      viewBox="0 0 120 50"
      className="w-full h-full"
      preserveAspectRatio="none"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <defs>
        <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4edea3" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4edea3" stopOpacity="0" />
        </linearGradient>
      </defs>

      {GRID_FRACTIONS.map((fraction) => {
        const y = padY + chartH * (1 - fraction);
        const label = Math.round(maxVal * fraction);

        return (
          <g key={fraction}>
            <line x1={padLeft} x2={chartRight} y1={y} y2={y} stroke="white" strokeOpacity="0.04" />
            <text
              x={padLeft - 1.5}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#a78b82"
              fontSize="4.5"
              fontFamily="var(--font-geist-mono)"
            >
              {label}
            </text>
          </g>
        );
      })}

      <path d={fillPath} fill="url(#lc-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke="#4edea3"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map((point, index) => (
        <g key={index}>
          <circle
            cx={point.x}
            cy={point.y}
            r="5"
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredIndex(index)}
          />
          <circle
            cx={point.x}
            cy={point.y}
            r={hoveredIndex === index ? 2.8 : 2}
            fill="#4edea3"
            stroke="#131315"
            strokeWidth="1"
            className="transition-all duration-150"
          />
        </g>
      ))}

      {hoveredIndex !== null && (() => {
        const point = points[hoveredIndex];
        const tooltipWidth = 14;
        const tooltipHeight = 8;
        const tooltipX = Math.min(Math.max(point.x - tooltipWidth / 2, padLeft), chartRight - tooltipWidth);
        const tooltipY = Math.max(point.y - 12, 2);

        return (
          <g pointerEvents="none">
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              rx="2"
              fill="rgba(19,19,21,0.92)"
              stroke="rgba(78,222,163,0.35)"
              strokeWidth="0.5"
            />
            <text
              x={tooltipX + tooltipWidth / 2}
              y={tooltipY + tooltipHeight / 2 + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#4edea3"
              fontSize="5"
              fontWeight="600"
              fontFamily="var(--font-geist-mono)"
            >
              {point.value}
            </text>
          </g>
        );
      })()}

      {points.map((point, index) => (
        <text
          key={`day-${index}`}
          x={point.x}
          y={50}
          textAnchor="middle"
          fill="#a78b82"
          fontSize="5"
          fontFamily="var(--font-geist-mono)"
        >
          {DAY_LABELS[index]}
        </text>
      ))}
    </svg>
  );
}
