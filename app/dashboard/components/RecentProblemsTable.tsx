"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { SiLeetcode, SiCodeforces } from "react-icons/si";
import type { IconType } from "react-icons";
import type { RecentProblem } from "@/app/lib/types/analytics";

interface RecentProblemsTableProps {
  data?: RecentProblem[] | null;
  /** "compact" = dashboard card capped to a few rows with a "view all" link. "full" = uncapped, standalone page. */
  variant?: "compact" | "full";
  /** Filter form content (full variant only) — toggled open/closed via the header's filter icon. */
  filterPanel?: ReactNode;
}

/** Number of rows visible before the table scrolls in compact mode (each row ~56px tall). */
const VISIBLE_ROWS = 6;
const ROW_HEIGHT_PX = 56;

/**
 * Shared grid template for header + rows so columns always line up.
 * Problem and Topics get flexible space; everything else is fixed-width,
 * keeping badges evenly spaced instead of clumped at the right edge.
 */
const GRID_TEMPLATE = "grid-cols-[minmax(200px,2fr)_minmax(160px,1.3fr)_96px_72px_136px_112px_92px]";
const TABLE_MIN_WIDTH = "min-w-[1020px]";

/** Fixed size (px) for every platform icon so LeetCode/Codeforces/AtCoder marks stay visually consistent. */
const PLATFORM_ICON_SIZE = 15;

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#6ffbbe",
  medium: "#ffb700",
  hard: "#f63737",
};

/** Simplified AtCoder monogram — no official brand SVG ships in Simple Icons, so we render a consistent "AC" glyph instead. */
const AtCoderIcon: IconType = ({ size = 24 }) => {
  const resolvedSize = typeof size === "number" ? size : parseInt(size, 10) || 24;

  return (
    <svg width={resolvedSize} height={resolvedSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor" fillOpacity="0.16" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fontFamily="var(--font-geist-mono)"
        fill="currentColor"
      >
        AC
      </text>
    </svg>
  );
};

const PLATFORM_STYLES: Record<string, { bg: string; border: string; text: string; Icon: IconType }> = {
  leetcode: { bg: "rgba(244,113,68,0.08)", border: "rgba(244,113,68,0.2)", text: "#ffb59d", Icon: SiLeetcode },
  atcoder: { bg: "rgba(78,222,163,0.08)", border: "rgba(78,222,163,0.2)", text: "#4edea3", Icon: AtCoderIcon },
  codeforces: { bg: "rgba(200,198,201,0.08)", border: "rgba(200,198,201,0.2)", text: "#c8c6c9", Icon: SiCodeforces },
};

const DEFAULT_PLATFORM_STYLE = { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "#dfc0b6", Icon: SiCodeforces };

function formatSolvedDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  const key = (difficulty ?? "").toLowerCase();
  const color = DIFFICULTY_COLORS[key] ?? "#a78b82";

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: `${color}1A`, color }}
    >
      {difficulty ?? "—"}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const key = platform.toLowerCase();
  const style = PLATFORM_STYLES[key] ?? DEFAULT_PLATFORM_STYLE;
  const Icon = style.Icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[13px] font-semibold capitalize"
      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}
    >
      <span
        className="inline-flex items-center justify-center shrink-0"
        style={{ width: PLATFORM_ICON_SIZE, height: PLATFORM_ICON_SIZE }}
      >
        <Icon size={PLATFORM_ICON_SIZE} />
      </span>
      {platform}
    </span>
  );
}

function AlreadySolvedBadge({ alreadySolved }: { alreadySolved: boolean }) {
  const color = alreadySolved ? "#a78b82" : "#4edea3";

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold"
      style={{ background: `${color}1A`, color }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>
        {alreadySolved ? "history" : "fiber_new"}
      </span>
      {alreadySolved ? "True" : "False"}
    </span>
  );
}

function TagPills({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return <span className="text-[12px] text-[#a78b82]">—</span>;
  }

  const visible = tags.slice(0, 3);
  const remaining = tags.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((tag) => (
        <span
          key={tag}
          className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] text-[#dfc0b6]"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {tag}
        </span>
      ))}
      {remaining > 0 && (
        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] text-[#a78b82]">
          +{remaining}
        </span>
      )}
    </div>
  );
}

export default function RecentProblemsTable({ data, variant = "compact", filterPanel }: RecentProblemsTableProps) {
  const problems = data ?? [];
  const isCompact = variant === "compact";
  const maxHeight = VISIBLE_ROWS * ROW_HEIGHT_PX;
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  return (
    <section className="glass-card rounded-xl p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h3
          className="text-[24px] lg:text-[32px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#e5e1e4]"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          {isCompact ? "Recently Solved" : "All Solved Problems"}
        </h3>
        <div className="flex items-center gap-3">
          {isCompact ? (
            <>
              <span
                className="text-[11px] tracking-[0.05em] uppercase text-[#a78b82]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {problems.length} problem{problems.length === 1 ? "" : "s"}
              </span>
              <Link
                href="/dashboard/problems"
                aria-label="View all solved problems"
                title="View all solved problems"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[rgba(255,181,157,0.3)] text-[#ffb59d] hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  open_in_full
                </span>
              </Link>
            </>
          ) : (
            filterPanel && (
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                aria-expanded={isFilterOpen}
                aria-label="Toggle filters"
                title="Toggle filters"
                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all active:scale-95 ${
                  isFilterOpen
                    ? "border-[rgba(255,181,157,0.5)] bg-[rgba(255,181,157,0.1)] text-[#ffb59d]"
                    : "border-white/10 text-[#dfc0b6] hover:bg-white/5"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  tune
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {!isCompact && filterPanel && isFilterOpen && filterPanel}

      {problems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <span className="material-symbols-outlined text-3xl text-[#a78b82]">inventory_2</span>
          <p className="text-[14px] text-[#dfc0b6]">No problems solved yet.</p>
          <p className="text-[12px] text-[#a78b82]">
            Solve problems on your connected platforms, then refresh to see them here.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-white/5 overflow-x-auto">
          <div className={TABLE_MIN_WIDTH}>
            {/* Column headers */}
            <div
              className={`grid ${GRID_TEMPLATE} gap-4 px-4 py-3 bg-white/3 border-b border-white/5 text-[11px] tracking-[0.08em] uppercase text-[#a78b82]`}
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              <span>Problem</span>
              <span>Topics</span>
              <span className="text-center">Difficulty</span>
              <span className="text-center">Rating</span>
              <span className="text-center">Platform</span>
              <span className="text-center">Already Solved</span>
              <span className="text-right">Date</span>
            </div>

            {/* Body — scrollable + capped in compact mode, full length on the standalone page */}
            <div
              className={isCompact ? "overflow-y-auto" : undefined}
              style={isCompact ? { maxHeight: `${maxHeight}px` } : undefined}
            >
              {problems.map((problem, index) => (
                <div
                  key={`${problem.problemId}-${index}`}
                  className={`grid ${GRID_TEMPLATE} gap-4 items-center px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/3 transition-colors`}
                  style={{ minHeight: `${ROW_HEIGHT_PX}px` }}
                >
                  <div className="min-w-0">
                    <p className="text-[14px] text-[#e5e1e4] font-medium truncate" title={problem.title}>
                      {problem.title}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <TagPills tags={problem.tags} />
                  </div>

                  <div className="flex justify-center">
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </div>

                  <span
                    className="text-[13px] text-[#dfc0b6] text-center"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {problem.rating ?? "—"}
                  </span>

                  <div className="flex justify-center">
                    <PlatformBadge platform={problem.platform} />
                  </div>

                  <div className="flex justify-center">
                    <AlreadySolvedBadge alreadySolved={problem.alreadySolved} />
                  </div>

                  <span
                    className="text-[12px] text-[#a78b82] text-right"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {formatSolvedDate(problem.solvedDate)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
