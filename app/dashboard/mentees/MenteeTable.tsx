"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Last7DaysChart from "../components/Last7DaysChart";
import type { MenteeSummary } from "@/app/lib/types/mentorship";

export const TABLE_GRID_COLS = "minmax(170px,1.1fr) minmax(220px,1.6fr) 110px minmax(150px,1.1fr) minmax(150px,1fr) 110px";

/**
 * Shared mentee stats table, reused on the main roster page and on
 * per-group pages (same columns, just a filtered `mentees` array).
 */
export function MenteeTable({
    mentees,
    onNote,
    emptyState,
}: {
    mentees: MenteeSummary[];
    onNote: (menteeId: string, label: string) => void;
    emptyState: ReactNode;
}) {
    if (mentees.length === 0) {
        return <>{emptyState}</>;
    }

    return (
        <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                    {/* Header row */}
                    <div
                        className="grid gap-3 px-5 py-3 border-b border-white/5 text-[11px] uppercase tracking-wide text-[#dfc0b6] opacity-70"
                        style={{ gridTemplateColumns: TABLE_GRID_COLS, fontFamily: "var(--font-geist-mono)" }}
                    >
                        <span>Mentee</span>
                        <span>Solved · last 7 days</span>
                        <span className="text-center">Contests</span>
                        <span>Top tags</span>
                        <span>Streak &amp; solved</span>
                        <span />
                    </div>

                    {mentees.map((m) => (
                        <MenteeRow key={m.userId} mentee={m} onNote={() => onNote(m.userId, m.name)} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function MenteeRow({ mentee, onNote }: { mentee: MenteeSummary; onNote: () => void }) {
    const isInactive = mentee.daysSinceActive === null || mentee.daysSinceActive > 7;

    return (
        <div
            className="grid gap-3 px-5 py-5 items-center border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors min-h-[112px]"
            style={{ gridTemplateColumns: TABLE_GRID_COLS }}
        >
            {/* Username */}
            <Link href={`/dashboard/mentees/${mentee.userId}`} className="flex items-center gap-3 min-w-0 group">
                <div className="w-10 h-10 rounded-full border-2 border-[rgba(255,181,157,0.4)] bg-[#353437] flex items-center justify-center shrink-0">
                    <span className="text-[15px] font-bold text-[#ffb59d]">{mentee.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#e5e1e4] truncate group-hover:text-[#ffb59d] transition-colors">
                        {mentee.name}
                    </p>
                    <p className="text-[11px] text-[#dfc0b6] opacity-70">
                        {mentee.completedAssignments}/{mentee.totalAssignments} tasks done
                    </p>
                    {isInactive && (
                        <p className="text-[11px] font-semibold text-[#ffb59d] mt-0.5">
                            {mentee.daysSinceActive === null
                                ? "Inactive · no activity yet"
                                : `Inactive for ${mentee.daysSinceActive} days`}
                        </p>
                    )}
                </div>
            </Link>

            {/* Last 7 days chart (exact dashboard graph) */}
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 shrink-0">
                    <p className="text-[18px] font-bold leading-none text-[#4edea3]" style={{ fontFamily: "var(--font-geist-sans)" }}>
                        {mentee.last7DaysSolved}
                    </p>
                    <p className="text-[10px] text-[#a78b82] uppercase mt-0.5">solved</p>
                </div>
                <div className="flex-1 min-w-0 h-24">
                    <Last7DaysChart breakdown={mentee.last7DaysBreakdown} />
                </div>
            </div>

            {/* Contests attended */}
            <div className="text-center">
                <span className="text-[15px] font-semibold text-[#c8acff]" style={{ fontFamily: "var(--font-geist-sans)" }}>
                    {mentee.contestsThisWeek}
                </span>
                <span className="text-[12px] text-[#a78b82]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                    /{mentee.contestsTotal}
                </span>
            </div>

            {/* Top 3 recent tags */}
            <div className="flex flex-wrap gap-1.5 min-w-0">
                {mentee.topTags.length === 0 ? (
                    <span className="text-[12px] text-[#dfc0b6] opacity-50">—</span>
                ) : (
                    mentee.topTags.map((tag) => <TagPill key={tag} tag={tag} />)
                )}
            </div>

            {/* Streak & total solved (with today's increase) */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[#f47144]" title="Current streak">
                    <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                    <span className="text-[14px] font-bold" style={{ fontFamily: "var(--font-geist-sans)" }}>
                        {mentee.currentStreak}d
                    </span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-[15px] font-semibold text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-sans)" }}>
                        {mentee.totalSolved}
                    </span>
                    {mentee.solvedToday > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#4edea3] align-sub">
                            (+{mentee.solvedToday}
                            <span className="material-symbols-outlined" style={{ fontSize: "10px" }}>
                                arrow_upward
                            </span>
                            )
                        </span>
                    )}
                </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center justify-end gap-3">
                <Link
                    href={`/dashboard/mentees/${mentee.userId}`}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#dfc0b6] hover:text-[#ffb59d] transition-colors"
                    title="View full dashboard"
                >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    View
                </Link>
                <button
                    type="button"
                    onClick={onNote}
                    className="text-[#dfc0b6] hover:text-[#ffb59d] transition-colors"
                    aria-label={`Send note to ${mentee.name}`}
                    title="Send note"
                >
                    <span className="material-symbols-outlined text-[20px]">chat</span>
                </button>
            </div>
        </div>
    );
}

export function TagPill({ tag }: { tag: string }) {
    return (
        <span className="text-[11px] font-medium text-[#e5e1e4] bg-white/5 border border-white/10 px-2 py-1 rounded-full whitespace-nowrap">
            {tag}
        </span>
    );
}
