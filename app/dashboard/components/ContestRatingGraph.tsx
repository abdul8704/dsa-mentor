"use client";

import { useMemo, useState } from "react";
import type { ContestRatingData, ContestRatingPoint } from "@/app/lib/types/analytics";
import Card, { Delta, EmptyState } from "./ui/Card";
import { PLATFORM_ORDER, PlatformLogo, platformMeta } from "./ui/platforms";
import { Segmented, useChartTip } from "./ui/interaction";

interface ContestRatingGraphProps {
  data?: ContestRatingData | null;
}

type Range = "7" | "14" | "30" | "all";

const RANGES: { value: Range; label: string }[] = [
  { value: "7", label: "7D" },
  { value: "14", label: "14D" },
  { value: "30", label: "30D" },
  { value: "all", label: "All" },
];

/** Returns today's date as an ISO string (YYYY-MM-DD) in local time. */
function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

const DEFAULT_DATA: ContestRatingData = {
  current: 0,
  peak: 0,
  momChange: 0,
  totalContests: 0,
  percentile: "—",
  history: [],
  platformHistories: {},
};

const W = 640;
const H = 220;
const PL = 44;
const PR = 12;
const PT = 22;
const PB = 24;

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Rating history, one platform at a time. Codeforces, LeetCode and AtCoder
 * ratings are different scales, so they never share an axis. Stats (current,
 * peak, last change, contests) use the platform's full history; the time
 * range only clips what the chart draws.
 */
export default function ContestRatingGraph({ data }: ContestRatingGraphProps) {
  const d: ContestRatingData = data ?? DEFAULT_DATA;
  const tip = useChartTip();

  const platformNames: string[] = useMemo(
    () =>
      Object.keys(d.platformHistories)
        .filter((k) => (d.platformHistories[k] ?? []).length > 0)
        .sort((a, b) => ((PLATFORM_ORDER.indexOf(a.toLowerCase() as never) + 100) % 100) - ((PLATFORM_ORDER.indexOf(b.toLowerCase() as never) + 100) % 100)),
    [d.platformHistories]
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("all");
  const platform = picked && platformNames.includes(picked) ? picked : platformNames[0] ?? null;

  // Cutoff date (inclusive) for the selected time range, or null for "All".
  const cutoffDate: string | null = useMemo(() => {
    if (range === "all") return null;
    const date: Date = new Date();
    date.setDate(date.getDate() - Number(range));
    return date.toISOString().split("T")[0];
  }, [range]);

  const full: ContestRatingPoint[] = useMemo(() => (platform ? d.platformHistories[platform] ?? [] : []), [platform, d.platformHistories]);

  // History clipped to the range. With no contests in the window, draw a flat
  // line at the last known rating instead of an empty chart.
  const points: (ContestRatingPoint & { flat?: boolean })[] = useMemo(() => {
    if (full.length === 0) return [];
    if (!cutoffDate) return full;
    const inWindow = full.filter((p) => p.date >= cutoffDate);
    if (inWindow.length > 0) return inWindow;
    const last = full[full.length - 1];
    return [
      { ...last, date: cutoffDate, contestId: `${last.contestId}-flat-start`, flat: true },
      { ...last, date: todayISO(), contestId: `${last.contestId}-flat-end`, flat: true },
    ];
  }, [full, cutoffDate]);

  const stats = useMemo(() => {
    const total = full.length;
    const current = total > 0 ? full[total - 1].rating : 0;
    const diff = total >= 2 ? full[total - 1].rating - full[total - 2].rating : 0;
    const peak = full.reduce((a, p) => Math.max(a, p.rating), 0);
    return { total, current, diff, peak };
  }, [full]);

  if (platformNames.length === 0 && d.totalContests === 0) {
    return (
      <Card title="Contest rating">
        <EmptyState icon="emoji_events" title="No contest data yet" hint="Participate in contests to see your rating graph." />
      </Card>
    );
  }

  const meta = platform ? platformMeta(platform) : null;
  const ratings = points.map((p) => p.rating);
  const lo = ratings.length ? Math.min(...ratings) : 0;
  const hi = ratings.length ? Math.max(...ratings) : 100;
  const pad = Math.max(40, (hi - lo) * 0.15);
  const y0 = Math.max(0, Math.floor((lo - pad) / 50) * 50);
  const y1 = Math.ceil((hi + pad) / 50) * 50;
  const step = Math.max(50, Math.round((y1 - y0) / 4 / 50) * 50);
  const ticks: number[] = [];
  for (let v = y0; v <= y1; v += step) ticks.push(v);

  const times = points.map((p) => new Date(p.date).getTime());
  const t0 = times[0] ?? 0;
  const t1 = times[times.length - 1] ?? 1;
  const X = (i: number) => PL + (W - PL - PR) * (t1 === t0 ? i / Math.max(points.length - 1, 1) : (times[i] - t0) / (t1 - t0));
  const Y = (r: number) => PT + (H - PT - PB) * (1 - (r - y0) / (y1 - y0 || 1));
  const line = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.rating).toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${X(points.length - 1).toFixed(1)},${H - PB} L${X(0).toFixed(1)},${H - PB} Z` : "";
  const peakIdx = points.reduce((a, p, i) => (p.rating > points[a].rating ? i : a), 0);
  const gradId = `rating-grad-${meta?.key ?? "x"}`;

  return (
    <Card
      title="Contest rating"
      hint={d.percentile && d.percentile !== "—" ? <span className="dash-chip dash-chip-accent">{d.percentile}</span> : undefined}
      action={
        <>
          {platformNames.length > 1 && (
            <Segmented
              label="Platform"
              value={platform ?? ""}
              onChange={(v) => setPicked(v)}
              options={platformNames.map((p) => ({
                value: p,
                ariaLabel: platformMeta(p).name,
                label: (
                  <>
                    <PlatformLogo platform={p} size={13} />
                    {platformMeta(p).short}
                  </>
                ),
              }))}
            />
          )}
          <Segmented label="Time range" value={range} onChange={setRange} options={RANGES} />
        </>
      }
    >
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <dt className="dash-label">Current</dt>
          <dd className="dash-num text-[22px] font-semibold text-[color:var(--dash-content-primary)]">{stats.current.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="dash-label">Peak</dt>
          <dd className="dash-num text-[22px] font-semibold text-[color:var(--dash-content-primary)]">{stats.peak.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="dash-label">Last change</dt>
          <dd className="mt-1.5">
            <Delta value={stats.diff} />
          </dd>
        </div>
        <div>
          <dt className="dash-label">Contests</dt>
          <dd className="dash-num text-[22px] font-semibold text-[color:var(--dash-content-primary)]">{stats.total}</dd>
        </div>
      </dl>

      {meta && points.length > 0 && (
        <svg key={`${meta.key}-${range}`} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" role="img" aria-label={`${meta.name} rating history, ${points.length} points`}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={meta.color} stopOpacity="0.35" />
              <stop offset="1" stopColor={meta.color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PL} x2={W - PR} y1={Y(v)} y2={Y(v)} stroke="var(--dash-border-subtle)" />
              <text x={PL - 8} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="var(--dash-content-tertiary)" className="dash-num">
                {v}
              </text>
            </g>
          ))}
          <path d={area} fill={`url(#${gradId})`} className="dash-anim-fade" />
          <path d={line} pathLength={1} fill="none" stroke={meta.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" className="dash-anim-draw" />
          {[0, points.length - 1].map((i, k) => (
            <text key={k} x={X(i)} y={H - 6} textAnchor={k ? "end" : "start"} fontSize="10" fill="var(--dash-content-tertiary)">
              {fmtDate(points[i].date)}
            </text>
          ))}
          {!points[0].flat && (
            <text x={X(peakIdx)} y={Y(points[peakIdx].rating) - 10} textAnchor="middle" fontSize="10" fill="var(--dash-content-secondary)" className="dash-num">
              peak {points[peakIdx].rating}
            </text>
          )}
          {!points[0].flat &&
            points.map((p, i) => {
              const fi = full.indexOf(p);
              const dd = fi > 0 ? p.rating - full[fi - 1].rating : 0;
              const last = i === points.length - 1;
              return (
                <g
                  key={p.contestId}
                  className="group"
                  onPointerMove={(e) =>
                    tip.show(e, (
                      <>
                        {fmtDate(p.date)} · {p.contestId}
                        <br />
                        Rating <b className="dash-num">{p.rating}</b> ({dd >= 0 ? "+" : ""}
                        {dd})
                      </>
                    ))
                  }
                  onPointerLeave={tip.hide}
                >
                  <circle cx={X(i)} cy={Y(p.rating)} r="10" fill="transparent" />
                  <circle
                    cx={X(i)}
                    cy={Y(p.rating)}
                    r={last ? 4.5 : 3}
                    fill={meta.color}
                    stroke="var(--dash-surface-raised)"
                    strokeWidth="2"
                    className="transition-transform duration-150 group-hover:scale-150 [transform-box:fill-box] [transform-origin:center]"
                  />
                </g>
              );
            })}
        </svg>
      )}
      {points.length > 0 && points[0].flat && (
        <p className="text-xs text-[color:var(--dash-content-tertiary)] -mt-2">No contests in this range. The line shows your last rating.</p>
      )}

      <table className="sr-only">
        <caption>{meta?.name ?? ""} contest rating history</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Contest</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>
          {full.map((p) => (
            <tr key={p.contestId}>
              <td>{p.date}</td>
              <td>{p.contestId}</td>
              <td>{p.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {tip.node}
    </Card>
  );
}
