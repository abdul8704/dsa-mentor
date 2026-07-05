"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignProblem, markAssignmentComplete } from "@/app/actions/assignment.actions";
import type { AssignmentView } from "@/app/lib/types/mentorship";

interface AssignmentPanelProps {
    menteeId: string;
    initialAssignments: AssignmentView[];
}

/**
 * Mentor-facing panel to assign new problems (by URL) and track existing
 * assignments for a mentee. Completion happens automatically after a sync, but
 * the mentor can also mark manually.
 */
export default function AssignmentPanel({ menteeId, initialAssignments }: AssignmentPanelProps) {
    const router = useRouter();
    const [url, setUrl] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
    const [formOpen, setFormOpen] = useState(false);

    const pending = initialAssignments.filter((a) => a.status === "pending");
    const completed = initialAssignments.filter((a) => a.status === "completed");

    async function handleAssign() {
        if (submitting || !url.trim()) return;
        setSubmitting(true);
        setMessage(null);
        try {
            const result = await assignProblem({ menteeId, url, dueDate: dueDate || null, note: note || null });
            setMessage({ text: result.message, ok: result.success });
            if (result.success) {
                setUrl("");
                setDueDate("");
                setNote("");
                router.refresh();
            }
        } catch {
            setMessage({ text: "Something went wrong assigning the problem.", ok: false });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleComplete(id: string) {
        try {
            const result = await markAssignmentComplete(id);
            if (result.success) router.refresh();
            else setMessage({ text: result.message, ok: false });
        } catch {
            setMessage({ text: "Could not update the task.", ok: false });
        }
    }

    return (
        <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[20px] font-semibold text-[#e5e1e4]">Assignments</h2>
                <button
                    type="button"
                    onClick={() => setFormOpen((v) => !v)}
                    className="inline-flex items-center gap-2 py-2 px-4 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[14px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-[18px]">{formOpen ? "close" : "add"}</span>
                    {formOpen ? "Cancel" : "Assign problem"}
                </button>
            </div>

            {/* Assign form (collapsible) */}
            {formOpen && (
                <div className="bg-white/5 rounded-lg p-4 mb-5 flex flex-col gap-3 animate-[dashboard-fade-in_0.2s_ease]">
                    <div>
                        <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                            Problem URL
                        </label>
                        <input
                            className="auth-input w-full mt-1"
                            placeholder="https://leetcode.com/problems/two-sum/"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        <p className="text-[11px] text-[#dfc0b6] opacity-60 mt-1">
                            Supports LeetCode, Codeforces, and AtCoder problem links.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                                Due date (optional)
                            </label>
                            <input type="date" className="auth-input w-full mt-1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                                Note (optional)
                            </label>
                            <input className="auth-input w-full mt-1" placeholder="Focus on the two-pointer approach" value={note} onChange={(e) => setNote(e.target.value)} />
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={submitting || !url.trim()}
                        onClick={() => void handleAssign()}
                        className="self-start inline-flex items-center gap-2 py-2.5 px-5 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined ${submitting ? "animate-spin" : ""}`}>
                            {submitting ? "progress_activity" : "assignment_turned_in"}
                        </span>
                        {submitting ? "Assigning…" : "Assign"}
                    </button>
                </div>
            )}

            {message && (
                <p className={`text-[13px] mb-4 ${message.ok ? "text-[#4edea3]" : "text-[#ffb59d]"}`}>{message.text}</p>
            )}

            {/* Pending */}
            {pending.length === 0 && completed.length === 0 ? (
                <p className="text-[14px] text-[#dfc0b6] opacity-70 py-4 text-center">No assignments yet.</p>
            ) : (
                <div className="space-y-5">
                    {pending.length > 0 && (
                        <div>
                            <p className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70 mb-2" style={{ fontFamily: "var(--font-geist-mono)" }}>
                                Pending ({pending.length})
                            </p>
                            <div className="space-y-2">
                                {pending.map((a) => (
                                    <AssignmentRow key={a.id} a={a} onComplete={() => void handleComplete(a.id)} />
                                ))}
                            </div>
                        </div>
                    )}
                    {completed.length > 0 && (
                        <div>
                            <p className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70 mb-2" style={{ fontFamily: "var(--font-geist-mono)" }}>
                                Completed ({completed.length})
                            </p>
                            <div className="space-y-2">
                                {completed.map((a) => (
                                    <AssignmentRow key={a.id} a={a} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function AssignmentRow({ a, onComplete }: { a: AssignmentView; onComplete?: () => void }) {
    const isDone = a.status === "completed";
    return (
        <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
            <PlatformBadge platform={a.platform} />
            <div className="min-w-0 flex-1">
                {a.url ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#e5e1e4] hover:text-[#ffb59d] transition-colors truncate block">
                        {a.title}
                    </a>
                ) : (
                    <span className="text-[14px] text-[#e5e1e4] truncate block">{a.title}</span>
                )}
                <p className="text-[11px] text-[#dfc0b6] opacity-70">
                    {a.dueDate ? `Due ${a.dueDate}` : "No due date"}
                    {a.note ? `  ·  ${a.note}` : ""}
                </p>
            </div>
            {isDone ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold text-[#4edea3]">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    {a.completedVia === "auto" ? "Auto" : "Done"}
                </span>
            ) : (
                onComplete && (
                    <button
                        type="button"
                        onClick={onComplete}
                        className="shrink-0 inline-flex items-center gap-1 py-1.5 px-3 rounded-lg border border-white/10 text-[#dfc0b6] text-[12px] font-semibold hover:bg-white/5 hover:text-[#e5e1e4] active:scale-95 transition-all"
                    >
                        Mark done
                    </button>
                )
            )}
        </div>
    );
}

function PlatformBadge({ platform }: { platform: string }) {
    const label = platform.slice(0, 2).toUpperCase();
    return (
        <div className="w-9 h-9 rounded-lg bg-[#353437] flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-[#ffb59d]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                {label}
            </span>
        </div>
    );
}
