"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteGoal, setProblemRevised } from "@/app/actions/goals.actions";
import type { GoalOwnerOption, GoalStatus, GoalView } from "@/app/lib/types/goals";
import GoalForm from "./GoalForm";

interface GoalsClientProps {
    goals: GoalView[];
    owners: GoalOwnerOption[];
    ownerId: string;
}

const PLATFORM_SHORT: Record<string, string> = { leetcode: "LC", codeforces: "CF", atcoder: "AC", cses: "CSES" };

const STATUS_STYLE: Record<GoalStatus, { label: string; color: string; highlight: boolean }> = {
    overdue: { label: "Overdue", color: "var(--dash-feedback-danger)", highlight: true },
    "due-soon": { label: "Due soon", color: "var(--dash-feedback-warning)", highlight: true },
    active: { label: "In progress", color: "#ffb59d", highlight: false },
    upcoming: { label: "Upcoming", color: "#dfc0b6", highlight: false },
    completed: { label: "Completed", color: "var(--dash-feedback-success)", highlight: false },
};

const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

function dueText(g: GoalView): string {
    if (g.status === "completed") return g.daysLeft >= 0 ? `Done · due ${fmt(g.periodEnd)}` : `Done · ended ${fmt(g.periodEnd)}`;
    if (g.status === "upcoming") {
        const todayUtc = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
        const startsIn = Math.round((Date.parse(`${g.periodStart}T00:00:00Z`) - todayUtc) / 86_400_000);
        return `Starts ${startsIn <= 1 ? "tomorrow" : `in ${startsIn} days`}`;
    }
    if (g.daysLeft < 0) return `Overdue by ${-g.daysLeft} day${g.daysLeft === -1 ? "" : "s"}`;
    if (g.daysLeft === 0) return "Due today";
    return `${g.daysLeft} day${g.daysLeft === 1 ? "" : "s"} left`;
}

/**
 * Goals board: overdue goals first, then open goals by due date, then
 * completed ones. Each card tracks progress automatically from synced solves.
 */
export default function GoalsClient({ goals, owners, ownerId }: GoalsClientProps) {
    const router = useRouter();
    const [message, setMessage] = useState<string | null>(null);
    const [editing, setEditing] = useState<GoalView | "new" | null>(null);

    const owner = owners.find((o) => o.userId === ownerId);
    const isMine = owner?.isMe ?? true;
    const open = goals.filter((g) => g.status !== "completed");
    const done = goals.filter((g) => g.status === "completed");

    async function handleDelete(goal: GoalView) {
        if (!window.confirm(`Delete "${goal.name}"? This can't be undone.`)) return;
        const result = await deleteGoal(goal.id);
        setMessage(result.message);
        if (result.success) router.refresh();
    }

    async function handleRevised(goal: GoalView, problemId: string, revised: boolean) {
        const result = await setProblemRevised(goal.id, problemId, revised);
        if (!result.success) setMessage(result.message);
        router.refresh();
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1">
                    <h1 className="text-[28px] lg:text-[32px] font-semibold tracking-[-0.02em] text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-sans)" }}>
                        {isMine ? "Your Goals" : `${owner?.name}'s Goals`}
                    </h1>
                    <p className="text-[#dfc0b6] opacity-80 mt-1">
                        {open.length} open · {done.length} completed · progress updates after each sync
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {owners.length > 1 && (
                        <select
                            className="auth-input py-2"
                            value={ownerId}
                            onChange={(e) => {
                                const target = owners.find((o) => o.userId === e.target.value);
                                router.push(target?.isMe ? "/dashboard/goals" : `/dashboard/goals?user=${e.target.value}`);
                            }}
                            aria-label="Whose goals"
                        >
                            {owners.map((o) => (
                                <option key={o.userId} value={o.userId}>
                                    {o.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        type="button"
                        onClick={() => setEditing("new")}
                        className="inline-flex items-center gap-1 py-2 px-4 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        New goal
                    </button>
                </div>
            </div>

            {message && <p className="text-[13px] text-[#4edea3]">{message}</p>}

            {goals.length === 0 ? (
                <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
                    <span className="material-symbols-outlined text-[48px] text-[#ffb59d] opacity-70">flag</span>
                    <p className="text-[18px] font-semibold text-[#e5e1e4]">No goals yet</p>
                    <p className="text-[#dfc0b6] opacity-80 max-w-md">
                        Set a target like &ldquo;solve 18 new LeetCode problems this week&rdquo; or pick problems to revise
                        by a date. Progress fills in by itself as solves sync.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {open.length > 0 && (
                        <Group title={`Open (${open.length})`}>
                            {open.map((g) => (
                                <GoalCard
                                    key={g.id}
                                    goal={g}
                                    onEdit={() => setEditing(g)}
                                    onDelete={() => void handleDelete(g)}
                                    onRevised={(pid, r) => void handleRevised(g, pid, r)}
                                />
                            ))}
                        </Group>
                    )}
                    {done.length > 0 && (
                        <Group title={`Completed (${done.length})`}>
                            {done.map((g) => (
                                <GoalCard
                                    key={g.id}
                                    goal={g}
                                    onEdit={() => setEditing(g)}
                                    onDelete={() => void handleDelete(g)}
                                    onRevised={(pid, r) => void handleRevised(g, pid, r)}
                                />
                            ))}
                        </Group>
                    )}
                </div>
            )}

            {editing && (
                <GoalForm
                    ownerId={ownerId}
                    goal={editing === "new" ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={(msg) => {
                        setEditing(null);
                        setMessage(msg);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70 mb-2" style={{ fontFamily: "var(--font-geist-mono)" }}>
                {title}
            </p>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-[#dfc0b6]" style={{ fontFamily: "var(--font-geist-mono)" }}>
            {children}
        </span>
    );
}

function GoalCard({
    goal,
    onEdit,
    onDelete,
    onRevised,
}: {
    goal: GoalView;
    onEdit: () => void;
    onDelete: () => void;
    onRevised: (problemId: string, revised: boolean) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const style = STATUS_STYLE[goal.status];
    const pct = goal.targetCount > 0 ? Math.min(100, Math.round((goal.progress / goal.targetCount) * 100)) : 0;
    const isRevise = goal.kind === "revise";

    return (
        <div
            className="glass-card rounded-xl p-5"
            style={
                style.highlight
                    ? {
                          borderColor: `color-mix(in srgb, ${style.color} 55%, transparent)`,
                          background: `linear-gradient(135deg, color-mix(in srgb, ${style.color} 10%, transparent) 0%, transparent 60%)`,
                      }
                    : undefined
            }
        >
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]" style={{ color: style.color }}>
                            {isRevise ? "history" : "flag"}
                        </span>
                        <h3 className="text-[17px] font-semibold text-[#e5e1e4] break-words">{goal.name}</h3>
                        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: style.color, fontFamily: "var(--font-geist-mono)" }}>
                            {style.label}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge>{isRevise ? "Revise" : "Solve"}</Badge>
                        {goal.recurrence !== "none" && <Badge>{goal.recurrence === "weekly" ? "Every week" : "Every month"}</Badge>}
                        {!isRevise && (
                            <Badge>{goal.platforms ? goal.platforms.map((p) => PLATFORM_SHORT[p] ?? p).join(" + ") : "All platforms"}</Badge>
                        )}
                        {!isRevise && <Badge>{goal.includeAlreadySolved ? "Re-solves count" : "New problems only"}</Badge>}
                        {goal.createdByName && <Badge>Set by {goal.createdByName}</Badge>}
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <IconButton icon="edit" label="Edit goal" onClick={onEdit} />
                    <IconButton icon="delete" label="Delete goal" onClick={onDelete} />
                </div>
            </div>

            <div className="mt-4">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="text-[#e5e1e4]">
                        <span className="text-[20px] font-semibold" style={{ color: style.color }}>
                            {goal.progress}
                        </span>
                        <span className="text-[#dfc0b6]"> / {goal.targetCount} {isRevise ? "revised" : "solved"}</span>
                    </span>
                    <span className="text-[#dfc0b6] text-right">
                        {fmt(goal.periodStart)} – {fmt(goal.periodEnd)} · <span style={{ color: style.highlight ? style.color : undefined }}>{dueText(goal)}</span>
                    </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: style.color }} />
                </div>
            </div>

            {goal.history.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-[11px] text-[#dfc0b6]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                    <span className="opacity-70">Previous {goal.recurrence === "weekly" ? "weeks" : "months"}:</span>
                    {[...goal.history].reverse().map((h) => (
                        <span
                            key={h.start}
                            title={`${fmt(h.start)} – ${fmt(h.end)}: ${h.progress}/${goal.targetCount}`}
                            className="w-3 h-3 rounded-full"
                            style={{ background: h.met ? "var(--dash-feedback-success)" : "color-mix(in srgb, var(--dash-feedback-danger) 70%, transparent)" }}
                        />
                    ))}
                </div>
            )}

            {(goal.problems.length > 0 || isRevise) && (
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="mt-3 inline-flex items-center gap-1 text-[12px] text-[#dfc0b6] hover:text-[#ffb59d] transition-colors"
                >
                    <span className="material-symbols-outlined text-[16px]">{expanded ? "expand_less" : "expand_more"}</span>
                    {expanded ? "Hide problems" : isRevise ? `Show ${goal.problems.length} problems` : `Show ${goal.problems.length} counted problems`}
                </button>
            )}

            {expanded && (
                <ul className="mt-2 space-y-1.5">
                    {goal.problems.map((p) => (
                        <li key={p.problemId} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                            <span className="text-[10px] font-bold text-[#ffb59d] w-9 shrink-0" style={{ fontFamily: "var(--font-geist-mono)" }}>
                                {PLATFORM_SHORT[p.platform] ?? p.platform.slice(0, 4).toUpperCase()}
                            </span>
                            {p.url ? (
                                <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-[14px] text-[#e5e1e4] hover:text-[#ffb59d] transition-colors">
                                    {p.title}
                                </a>
                            ) : (
                                <span className="flex-1 min-w-0 truncate text-[14px] text-[#e5e1e4]">{p.title}</span>
                            )}
                            {isRevise ? (
                                p.revisedVia === "auto" ? (
                                    <span className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold text-[#4edea3]" title={`Re-solved ${p.solvedDate}`}>
                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                        Re-solved
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => onRevised(p.problemId, !p.revised)}
                                        className={`shrink-0 inline-flex items-center gap-1 py-1 px-2 rounded-md text-[12px] font-semibold transition-all active:scale-95 ${
                                            p.revised
                                                ? "text-[#4edea3] hover:bg-white/5"
                                                : "border border-[rgba(255,181,157,0.4)] text-[#ffb59d] hover:bg-[rgba(255,181,157,0.08)]"
                                        }`}
                                        title={p.revised ? "Marked as revised. Click to undo." : "Mark as revised without resubmitting"}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{p.revised ? "check_circle" : "done"}</span>
                                        {p.revised ? "Revised" : "Mark revised"}
                                    </button>
                                )
                            ) : (
                                p.solvedDate && <span className="shrink-0 text-[11px] text-[#dfc0b6] opacity-70">{fmt(p.solvedDate)}</span>
                            )}
                        </li>
                    ))}
                    {!isRevise && goal.problems.length === 0 && (
                        <li className="text-[13px] text-[#dfc0b6] opacity-70 px-3">Nothing counted yet this period.</li>
                    )}
                </ul>
            )}
        </div>
    );
}

function IconButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#dfc0b6] hover:text-[#ffb59d] hover:bg-white/5 transition-colors"
        >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </button>
    );
}
