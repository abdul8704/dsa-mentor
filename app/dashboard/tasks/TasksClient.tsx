"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAssignmentComplete, } from "@/app/actions/assignment.actions";
import { respondToInvite } from "@/app/actions/mentorship.actions";
import type { TaskView, PendingInvite, MenteeNote } from "@/app/lib/types/mentorship";

interface TasksClientProps {
    tasks: TaskView[];
    pendingInvites: PendingInvite[];
    notes: MenteeNote[];
}

/**
 * Mentee task board: pending invites banner + notes from mentors + assigned
 * problems grouped by completion state. Completion normally happens
 * automatically after a sync, with a manual "Mark done" fallback.
 */
export default function TasksClient({ tasks, pendingInvites, notes }: TasksClientProps) {
    const router = useRouter();
    const [message, setMessage] = useState<string | null>(null);

    const pending = tasks.filter((t) => t.status === "pending");
    const completed = tasks.filter((t) => t.status === "completed");

    async function handleComplete(id: string) {
        try {
            const result = await markAssignmentComplete(id);
            setMessage(result.message);
            if (result.success) router.refresh();
        } catch {
            setMessage("Could not update the task.");
        }
    }

    async function handleInvite(token: string, accept: boolean) {
        try {
            const result = await respondToInvite(token, accept);
            setMessage(result.message);
            if (result.success) router.refresh();
        } catch {
            setMessage("Could not respond to the invitation.");
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[28px] lg:text-[32px] font-semibold tracking-[-0.02em] text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-sans)" }}>
                    Your Tasks
                </h1>
                <p className="text-[#dfc0b6] opacity-80 mt-1">
                    {pending.length} pending · {completed.length} completed
                </p>
            </div>

            {message && <p className="text-[13px] text-[#4edea3]">{message}</p>}

            {/* Pending invites */}
            {pendingInvites.length > 0 && (
                <div className="space-y-3">
                    {pendingInvites.map((inv) => (
                        <div
                            key={inv.token}
                            className="glass-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 border-[rgba(255,181,157,0.3)]"
                        >
                            <span className="material-symbols-outlined text-[#ffb59d] text-[28px]">group_add</span>
                            <p className="flex-1 text-[14px] text-[#e5e1e4]">
                                <span className="font-semibold text-[#ffb59d]">{inv.mentorName}</span> invited you to be
                                their mentee.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => void handleInvite(inv.token, true)}
                                    className="inline-flex items-center gap-1 py-2 px-4 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all"
                                >
                                    Accept
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleInvite(inv.token, false)}
                                    className="inline-flex items-center gap-1 py-2 px-4 border border-white/10 text-[#dfc0b6] font-semibold rounded-lg hover:bg-white/5 active:scale-95 transition-all"
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Notes from mentors */}
            {notes.length > 0 && <NotesList notes={notes} />}

            {/* Tasks */}
            {tasks.length === 0 ? (
                <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
                    <span className="material-symbols-outlined text-[48px] text-[#ffb59d] opacity-70">task_alt</span>
                    <p className="text-[18px] font-semibold text-[#e5e1e4]">No tasks yet</p>
                    <p className="text-[#dfc0b6] opacity-80 max-w-md">
                        When a mentor assigns you a problem, it&apos;ll appear here. Solve it and it&apos;ll be marked
                        complete automatically on your next sync.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {pending.length > 0 && (
                        <TaskGroup title={`Pending (${pending.length})`}>
                            {pending.map((t) => (
                                <TaskCard key={t.id} task={t} onComplete={() => void handleComplete(t.id)} />
                            ))}
                        </TaskGroup>
                    )}
                    {completed.length > 0 && (
                        <TaskGroup title={`Completed (${completed.length})`}>
                            {completed.map((t) => (
                                <TaskCard key={t.id} task={t} />
                            ))}
                        </TaskGroup>
                    )}
                </div>
            )}
        </div>
    );
}

function NotesList({ notes }: { notes: MenteeNote[] }) {
    return (
        <div className="glass-card rounded-xl p-5">
            <p className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70 mb-3" style={{ fontFamily: "var(--font-geist-mono)" }}>
                Notes from your mentor
            </p>
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {notes.map((n) => (
                    <div key={n.id} className="bg-white/5 rounded-lg p-3">
                        <p className="text-[14px] text-[#e5e1e4] whitespace-pre-wrap">{n.body}</p>
                        <p className="text-[11px] text-[#dfc0b6] opacity-60 mt-1">
                            {n.mentorName} · {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TaskGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70 mb-2" style={{ fontFamily: "var(--font-geist-mono)" }}>
                {title}
            </p>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function TaskCard({ task, onComplete }: { task: TaskView; onComplete?: () => void }) {
    const isDone = task.status === "completed";
    return (
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#353437] flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-[#ffb59d]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                    {task.platform.slice(0, 2).toUpperCase()}
                </span>
            </div>
            <div className="min-w-0 flex-1">
                {task.url ? (
                    <a href={task.url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-medium text-[#e5e1e4] hover:text-[#ffb59d] transition-colors truncate block">
                        {task.title}
                    </a>
                ) : (
                    <span className="text-[15px] font-medium text-[#e5e1e4] truncate block">{task.title}</span>
                )}
                <p className="text-[12px] text-[#dfc0b6] opacity-70">
                    From {task.mentorName}
                    {task.difficulty ? `  ·  ${task.difficulty}` : ""}
                    {task.dueDate ? `  ·  due ${task.dueDate}` : ""}
                    {task.note ? `  ·  ${task.note}` : ""}
                </p>
            </div>
            {isDone ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold text-[#4edea3]">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    {task.completedVia === "auto" ? "Auto-solved" : "Done"}
                </span>
            ) : (
                onComplete && (
                    <button
                        type="button"
                        onClick={onComplete}
                        className="shrink-0 inline-flex items-center gap-1 py-2 px-3 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[13px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-[16px]">done</span>
                        Mark done
                    </button>
                )
            )}
        </div>
    );
}
