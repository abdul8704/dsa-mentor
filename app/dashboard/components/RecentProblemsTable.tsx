"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { RecentProblem } from "@/app/lib/types/analytics";
import Card, { EmptyState } from "./ui/Card";
import { PlatformBadge } from "./ui/platforms";

interface RecentProblemsTableProps {
  data?: RecentProblem[] | null;
  /** "compact" = dashboard card capped to a few rows with a "view all" link. "full" = uncapped, standalone page. */
  variant?: "compact" | "full";
  /** Compact variant's "view all" link target; null hides it (e.g. on the public page). */
  viewAllHref?: string | null;
  /** Filter form content (full variant only) — toggled open/closed via the header's filter button. */
  filterPanel?: ReactNode;
}

/** Height of the compact table body before it scrolls (~8 rows). */
const COMPACT_MAX_HEIGHT = 8 * 52;

const DIFFICULTY: Record<string, { level: number; color: string }> = {
  easy: { level: 1, color: "var(--dash-diff-easy)" },
  medium: { level: 2, color: "var(--dash-diff-medium)" },
  hard: { level: 3, color: "var(--dash-diff-hard)" },
};

function formatSolvedDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Signal-bar difficulty: 1–3 filled bars plus the word, so colour isn't the only cue. */
function Difficulty({ difficulty }: { difficulty: string | null }) {
  const d = DIFFICULTY[(difficulty ?? "").toLowerCase()];
  if (!d) return <span className="text-[color:var(--dash-content-tertiary)]">—</span>;
  return (
    <span className="inline-flex items-center gap-2 text-[13px] capitalize" style={{ color: d.color }}>
      <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <i
            key={n}
            className="w-[3px] rounded-sm"
            style={{ height: `${4 + n * 3}px`, background: n <= d.level ? d.color : "var(--dash-surface-hover)" }}
          />
        ))}
      </span>
      {difficulty}
    </span>
  );
}

function ResolveMark() {
  return (
    <span
      className="dash-chip dash-chip-idle ml-2 align-middle"
      title="You had solved this problem before"
    >
      <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
        history
      </span>
      re-solve
    </span>
  );
}

function TagPills({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return <span className="text-xs text-[color:var(--dash-content-tertiary)]">—</span>;
  }
  const visible = tags.slice(0, 3);
  const remaining = tags.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((tag) => (
        <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] bg-[color:var(--dash-surface-sunken)] text-[color:var(--dash-content-secondary)]">
          {tag}
        </span>
      ))}
      {remaining > 0 && (
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-[color:var(--dash-surface-sunken)] text-[color:var(--dash-content-tertiary)]" title={tags.slice(3).join(", ")}>
          +{remaining}
        </span>
      )}
    </div>
  );
}

export default function RecentProblemsTable({
  data,
  variant = "compact",
  viewAllHref = "/dashboard/problems",
  filterPanel,
}: RecentProblemsTableProps) {
  const problems = data ?? [];
  const isCompact = variant === "compact";
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const action = isCompact ? (
    viewAllHref && (
      <Link href={viewAllHref} className="dash-btn dash-btn-ghost dash-btn-sm">
        View all
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          arrow_forward
        </span>
      </Link>
    )
  ) : (
    filterPanel && (
      <button
        type="button"
        onClick={() => setIsFilterOpen((prev) => !prev)}
        aria-expanded={isFilterOpen}
        className={`dash-btn dash-btn-sm ${isFilterOpen ? "dash-btn-primary" : "dash-btn-ghost"}`}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          tune
        </span>
        Filters
      </button>
    )
  );

  return (
    <Card
      title={isCompact ? "Recently solved" : "All solved problems"}
      hint={isCompact ? `latest ${problems.length}` : undefined}
      action={action}
    >
      {!isCompact && filterPanel && isFilterOpen && filterPanel}

      {problems.length === 0 ? (
        <EmptyState icon="inventory_2" title="No problems solved yet." hint="Solve problems on your connected platforms, then refresh to see them here." />
      ) : (
        <>
          {/* Phones: each problem as a stacked row instead of a squeezed table. */}
          <ul className="md:hidden flex flex-col divide-y divide-[color:var(--dash-border-subtle)]">
            {problems.map((p, i) => (
              <li key={`${p.problemId}-${i}`} className="py-3 flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-[color:var(--dash-content-primary)]">
                  {p.title}
                  {p.alreadySolved && <ResolveMark />}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <PlatformBadge platform={p.platform} size={13} />
                  <Difficulty difficulty={p.difficulty} />
                  {p.rating !== null && <span className="dash-num text-[color:var(--dash-content-secondary)]">{p.rating}</span>}
                  <span className="dash-num text-[color:var(--dash-content-tertiary)] ml-auto">{formatSolvedDate(p.solvedDate)}</span>
                </div>
                <TagPills tags={p.tags} />
              </li>
            ))}
          </ul>

          <div
            className={`hidden md:block -mx-5 px-5 ${isCompact ? "overflow-y-auto" : ""} overflow-x-auto`}
            style={isCompact ? { maxHeight: COMPACT_MAX_HEIGHT } : undefined}
          >
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead className="sticky top-0 z-[2] bg-[color:var(--dash-surface-raised)]">
                <tr className="text-xs text-[color:var(--dash-content-tertiary)]">
                  <th className="font-semibold py-2 pr-4 border-b border-[color:var(--dash-border-subtle)]">Problem</th>
                  <th className="font-semibold py-2 pr-4 border-b border-[color:var(--dash-border-subtle)]">Topics</th>
                  <th className="font-semibold py-2 pr-4 border-b border-[color:var(--dash-border-subtle)]">Difficulty</th>
                  <th className="font-semibold py-2 pr-4 border-b border-[color:var(--dash-border-subtle)] text-right">Rating</th>
                  <th className="font-semibold py-2 pr-4 border-b border-[color:var(--dash-border-subtle)]">Platform</th>
                  <th className="font-semibold py-2 border-b border-[color:var(--dash-border-subtle)] text-right">Solved</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p, i) => (
                  <tr
                    key={`${p.problemId}-${i}`}
                    className="group border-b border-[color:var(--dash-border-subtle)] last:border-b-0 transition-colors duration-[var(--dash-dur-fast)] hover:bg-[color:var(--dash-surface-sunken)]"
                  >
                    <td className="py-3 pr-4 max-w-[340px]">
                      <span className="text-sm font-medium text-[color:var(--dash-content-primary)] group-hover:text-[color:var(--dash-accent-soft)] transition-colors" title={p.title}>
                        {p.title}
                      </span>
                      {p.alreadySolved && <ResolveMark />}
                    </td>
                    <td className="py-3 pr-4">
                      <TagPills tags={p.tags} />
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <Difficulty difficulty={p.difficulty} />
                    </td>
                    <td className="py-3 pr-4 text-right dash-num text-[13px] text-[color:var(--dash-content-secondary)]">
                      {p.rating ?? <span className="text-[color:var(--dash-content-tertiary)]">—</span>}
                    </td>
                    <td className="py-3 pr-4">
                      <PlatformBadge platform={p.platform} />
                    </td>
                    <td className="py-3 text-right dash-num text-xs whitespace-nowrap text-[color:var(--dash-content-tertiary)]">{formatSolvedDate(p.solvedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
