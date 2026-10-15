"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { DifficultyStats, PlatformDifficultyMap } from "@/app/lib/types/analytics";
import Card, { EmptyState } from "./ui/Card";
import CountUp from "./ui/CountUp";
import { PLATFORM_ORDER, PlatformLogo, platformMeta } from "./ui/platforms";
import { useChartTip } from "./ui/interaction";

type DiffKey = "easy" | "medium" | "hard";

const DIFFS: { key: DiffKey; label: string; short: string; color: string }[] = [
  { key: "easy", label: "Easy", short: "Easy", color: "var(--dash-diff-easy)" },
  { key: "medium", label: "Medium", short: "Med.", color: "var(--dash-diff-medium)" },
  { key: "hard", label: "Hard", short: "Hard", color: "var(--dash-diff-hard)" },
];

const EMPTY: DifficultyStats = { easy: 0, medium: 0, hard: 0, total: 0 };

/* ── Gauge geometry: a 240° arc open at the bottom, like LeetCode's ───────── */
const CX = 100;
const CY = 96;
const R = 78;
const START = 150; // degrees, clockwise from +x (SVG)
const SWEEP = 240;
const GAP = 2.5; // degrees between segments

function polar(deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
}

function arc(from: number, to: number): string {
  const [x1, y1] = polar(from);
  const [x2, y2] = polar(to);
  const large = to - from > 180 ? 1 : 0;
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
}

/**
 * Easy/medium/hard arcs for one platform. The full arc is that platform's
 * solved total; problems without a difficulty tag stay as unfilled track, so
 * the arcs never claim more than the data says.
 */
function Gauge({
  platform,
  d,
  allTotal,
  activeDiff,
  setActiveDiff,
}: {
  platform: string;
  d: DifficultyStats;
  allTotal: number;
  activeDiff: DiffKey | null;
  setActiveDiff: (k: DiffKey | null) => void;
}) {
  const meta = platformMeta(platform);
  const total = Math.max(d.total, d.easy + d.medium + d.hard);
  const share = allTotal > 0 ? Math.round((d.total / allTotal) * 100) : 0;

  const spans = DIFFS.map((x) => (total > 0 ? (d[x.key] / total) * SWEEP : 0));
  const segs = DIFFS.map((x, i) => {
    const from = START + spans.slice(0, i).reduce((a, b) => a + b, 0);
    return { ...x, from, to: from + spans[i], span: spans[i] };
  }).filter((s) => s.span > 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(150px,200px)] items-center gap-5">
      <div className="relative mx-auto w-full max-w-[260px]">
        <svg viewBox="0 0 200 160" className="w-full h-auto overflow-visible" aria-hidden="true">
          <path d={arc(START, START + SWEEP)} fill="none" stroke="var(--dash-surface-hover)" strokeWidth="11" strokeLinecap="round" />
          {segs.map((s, i) => {
            const from = s.from + (i > 0 ? GAP / 2 : 0);
            const to = s.to - (i < segs.length - 1 ? GAP / 2 : 0);
            const dim = activeDiff !== null && activeDiff !== s.key;
            return (
              <path
                key={`${platform}-${s.key}`}
                d={arc(from, Math.max(from + 0.01, to))}
                pathLength={1}
                fill="none"
                stroke={s.color}
                strokeWidth={activeDiff === s.key ? 15 : 11}
                strokeLinecap="butt"
                className="dash-anim-draw"
                style={{
                  animationDelay: `${i * 140}ms`,
                  opacity: dim ? 0.25 : 1,
                  transition: "opacity var(--dash-dur-fast) var(--dash-ease), stroke-width var(--dash-dur-fast) var(--dash-ease)",
                  filter: activeDiff === s.key ? `drop-shadow(0 0 6px ${s.color})` : undefined,
                }}
                onPointerEnter={() => setActiveDiff(s.key)}
                onPointerLeave={() => setActiveDiff(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pb-3 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--dash-content-secondary)]">
            <PlatformLogo platform={platform} size={14} />
            {meta.name}
          </span>
          <span className="dash-num dash-hero-num mt-1" style={{ fontSize: "2.5rem" }}>
            <CountUp value={d.total} duration={700} />
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[color:var(--dash-content-primary)]">
            <span className="material-symbols-outlined text-[16px] text-[color:var(--dash-accent)]" aria-hidden="true">
              check
            </span>
            Solved
          </span>
          <span className="text-[11px] text-[color:var(--dash-content-tertiary)] mt-0.5">{share}% of all your solves</span>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {DIFFS.map((x, i) => {
          const pct = total > 0 ? Math.round((d[x.key] / total) * 100) : 0;
          const on = activeDiff === x.key;
          return (
            <li
              key={x.key}
              className="dash-anim-rise rounded-[var(--dash-r-md)] px-3.5 py-2.5 flex items-center justify-between gap-3 border transition-[transform,border-color,background-color] duration-[var(--dash-dur-fast)]"
              style={{
                animationDelay: `${120 + i * 70}ms`,
                background: on ? "var(--dash-surface-hover)" : "var(--dash-surface-raised)",
                borderColor: on ? x.color : "transparent",
                transform: on ? "translateX(-3px)" : undefined,
              }}
              onPointerEnter={() => setActiveDiff(x.key)}
              onPointerLeave={() => setActiveDiff(null)}
            >
              <span className="text-[13px] font-semibold" style={{ color: x.color }}>
                {x.short}
              </span>
              <span className="flex items-baseline gap-1.5">
                <b className="dash-num text-[15px] font-semibold text-[color:var(--dash-content-primary)]">{d[x.key]}</b>
                <span className="dash-num text-[11px] text-[color:var(--dash-content-tertiary)]">{pct}%</span>
              </span>
            </li>
          );
        })}
        {d.total > d.easy + d.medium + d.hard && (
          <li className="text-[11px] text-[color:var(--dash-content-tertiary)] px-1">
            {d.total - d.easy - d.medium - d.hard} without a difficulty tag
          </li>
        )}
      </ul>
    </div>
  );
}

/** The highlighted global total shown when no platform is focused. */
function GlobalTotal({ d }: { d: DifficultyStats }) {
  const tagged = d.easy + d.medium + d.hard;
  const base = Math.max(d.total, tagged) || 1;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(150px,200px)] items-center gap-5">
      <div className="flex flex-col gap-3 min-w-0">
        <div>
          <div className="dash-label">All platforms</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="dash-num dash-hero-num" style={{ fontSize: "3.25rem" }}>
              <CountUp value={d.total} />
            </span>
            <span className="text-sm text-[color:var(--dash-content-secondary)]">problems solved</span>
          </div>
        </div>
        <div className="flex h-3 gap-[3px] rounded-full overflow-hidden bg-[color:var(--dash-surface-hover)]">
          {DIFFS.map((x) =>
            d[x.key] > 0 ? (
              <i key={x.key} className="block h-full dash-anim-grow-x" style={{ width: `${(d[x.key] / base) * 100}%`, background: x.color }} />
            ) : null
          )}
        </div>
        <p className="text-xs text-[color:var(--dash-content-tertiary)]">
          Hover, tap or tab to a platform below to see its split.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {DIFFS.map((x) => (
          <li key={x.key} className="rounded-[var(--dash-r-md)] px-3.5 py-2.5 flex items-center justify-between bg-[color:var(--dash-surface-raised)]">
            <span className="text-[13px] font-semibold" style={{ color: x.color }}>
              {x.short}
            </span>
            <b className="dash-num text-[15px] font-semibold text-[color:var(--dash-content-primary)]">{d[x.key].toLocaleString()}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Difficulty by platform. The global total leads; each platform is a row with
 * a 100% easy/medium/hard bar. Focusing a row (hover, tap, keyboard) lifts and
 * enlarges it while the other rows recede and swaps the global total for that platform's half-donut.
 * Esc, "Show all", or leaving the list returns to the global view.
 */
export default function DifficultyByPlatform({ difficulty }: { difficulty?: PlatformDifficultyMap | null }) {
  const map = useMemo(() => difficulty ?? { all: EMPTY }, [difficulty]);
  const all = map.all ?? EMPTY;
  const tip = useChartTip();
  const [focus, setFocus] = useState<string | null>(null);
  const [activeDiff, setActiveDiff] = useState<DiffKey | null>(null);
  const lastPointer = useRef<string>("");

  const rows = useMemo(() => {
    const keys = Object.keys(map).filter((k) => k !== "all");
    return keys.sort((a, b) => {
      const ia = PLATFORM_ORDER.indexOf(a as never);
      const ib = PLATFORM_ORDER.indexOf(b as never);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [map]);

  const focused = focus && map[focus] ? focus : null;
  const gaugeKey = focused ?? rows[0] ?? null;

  function reset() {
    setFocus(null);
    setActiveDiff(null);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape" && focused) {
      reset();
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }

  if (all.total === 0 && rows.length === 0) {
    return (
      <Card title="Difficulty by platform">
        <EmptyState icon="donut_large" title="No solved problems yet" hint="Connect a platform and refresh to see your easy, medium and hard split." />
      </Card>
    );
  }

  return (
    <Card
      title="Difficulty by platform"
      hint="easy · medium · hard"
      action={
        <div className="flex items-center gap-3 text-xs text-[color:var(--dash-content-secondary)]">
          {DIFFS.map((x) => (
            <span key={x.key} className="inline-flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-[3px]" style={{ background: x.color }} aria-hidden="true" />
              {x.label}
            </span>
          ))}
        </div>
      }
    >
      <div onKeyDown={onKey} className="flex-1 flex flex-col gap-4">
        {/* Stage: the global total and the platform gauge share one grid cell
            and crossfade, so swapping them never shifts the layout. */}
        <div
          className="grid rounded-[var(--dash-r-lg)] p-4 sm:p-5 border border-[color:var(--dash-border-subtle)]"
          style={{ background: "var(--dash-grad-hero), var(--dash-surface-sunken)" }}
          aria-live="polite"
        >
          <div className={`[grid-area:1/1] dash-fade-swap ${focused ? "dash-hidden-swap" : ""}`} aria-hidden={!!focused}>
            <GlobalTotal d={all} />
          </div>
          <div className={`[grid-area:1/1] dash-fade-swap ${focused ? "" : "dash-hidden-swap"}`} aria-hidden={!focused}>
            {/* Always rendered (first platform while idle) so the stage keeps the
                gauge's height and the rows below never move. Re-keyed per
                platform so the arcs redraw each time one is focused. */}
            {gaugeKey && (
              <Gauge
                key={focused ?? "idle"}
                platform={gaugeKey}
                d={map[gaugeKey]}
                allTotal={all.total}
                activeDiff={activeDiff}
                setActiveDiff={setActiveDiff}
              />
            )}
          </div>
          {focused && (
            <span className="sr-only">
              {platformMeta(focused).name}: {map[focused].total} solved, {map[focused].easy} easy, {map[focused].medium} medium, {map[focused].hard} hard.
            </span>
          )}
        </div>

        <ul
          className="flex-1 flex flex-col justify-evenly gap-1.5"
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") reset();
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) reset();
          }}
        >
          {rows.map((k) => {
            const d = map[k];
            const meta = platformMeta(k);
            const base = Math.max(d.total, d.easy + d.medium + d.hard) || 1;
            const isOn = focused === k;
            const behind = focused !== null && !isOn;
            return (
              <li key={k}>
                <button
                  type="button"
                  aria-pressed={isOn}
                  aria-label={`${meta.name}: ${d.total} solved. Show difficulty split`}
                  className="relative w-full grid grid-cols-[minmax(110px,150px)_minmax(0,1fr)_auto] items-center gap-3 min-h-[52px] px-3 rounded-[var(--dash-r-md)] text-left border transition-[background-color,border-color,opacity,transform,box-shadow,filter] duration-[var(--dash-dur-base)] ease-[var(--dash-ease)] hover:bg-[color:var(--dash-surface-sunken)]"
                  style={{
                    // Focused row steps forward; the rest stay readable but recede.
                    opacity: behind ? 0.38 : 1,
                    filter: behind ? "saturate(0.5)" : undefined,
                    transform: isOn ? "scale(1.035)" : behind ? "scale(0.98)" : undefined,
                    zIndex: isOn ? 1 : undefined,
                    background: isOn ? "var(--dash-surface-hover)" : undefined,
                    borderColor: isOn ? "var(--dash-accent-line)" : "transparent",
                    boxShadow: isOn ? `var(--dash-shadow-2), 0 0 0 1px ${meta.color}33` : undefined,
                  }}
                  onPointerDown={(e) => {
                    lastPointer.current = e.pointerType;
                  }}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setFocus(k);
                  }}
                  onFocus={() => setFocus(k)}
                  onClick={() => {
                    const toggle = lastPointer.current !== "mouse";
                    lastPointer.current = "";
                    setFocus((prev) => (prev === k && toggle ? null : k));
                  }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <i className="w-[3px] h-4 rounded-full flex-none" style={{ background: meta.color }} aria-hidden="true" />
                    <PlatformLogo platform={k} size={isOn ? 18 : 16} />
                    <span className="text-[13px] font-semibold text-[color:var(--dash-content-primary)] truncate">{meta.name}</span>
                  </span>
                  <span
                    className="flex h-2.5 gap-[2px] rounded-full overflow-hidden bg-[color:var(--dash-surface-hover)] transition-transform duration-[var(--dash-dur-base)]"
                    style={{ transform: isOn ? "scaleY(1.4)" : undefined, background: isOn ? "var(--dash-surface-sunken)" : undefined }}
                    aria-hidden="true"
                  >
                    {DIFFS.map((x) =>
                      d[x.key] > 0 ? (
                        <i
                          key={x.key}
                          className="block h-full dash-anim-grow-x"
                          style={{ width: `${(d[x.key] / base) * 100}%`, background: x.color }}
                          onPointerMove={(e) =>
                            tip.show(e, <>{meta.name} · {x.label}: <b className="dash-num">{d[x.key]}</b> ({Math.round((d[x.key] / base) * 100)}%)</>)
                          }
                          onPointerLeave={tip.hide}
                        />
                      ) : null
                    )}
                  </span>
                  <b
                    className="dash-num font-semibold text-[color:var(--dash-content-primary)] min-w-[3ch] text-right"
                    style={{ fontSize: isOn ? 16 : 14 }}
                  >
                    {d.total}
                  </b>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={reset}
          tabIndex={focused ? 0 : -1}
          aria-hidden={!focused}
          className={`dash-btn dash-btn-ghost dash-btn-sm self-start dash-fade-swap ${focused ? "" : "dash-hidden-swap"}`}
        >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              arrow_back
            </span>
          Show all platforms
        </button>
      </div>
      {tip.node}
    </Card>
  );
}
