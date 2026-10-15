"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendNoteToMentee } from "@/app/actions/note.actions";
import type { SentNote } from "@/app/lib/types/mentorship";

interface NotesPanelProps {
    menteeId: string;
    initialNotes: SentNote[];
}

/** Mentor-facing panel to send a note to a mentee and review notes sent so far. */
export default function NotesPanel({ menteeId, initialNotes }: NotesPanelProps) {
    const router = useRouter();
    const [body, setBody] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
    const [formOpen, setFormOpen] = useState(false);

    async function handleSend() {
        if (submitting || !body.trim()) return;
        setSubmitting(true);
        setMessage(null);
        try {
            const result = await sendNoteToMentee(menteeId, body);
            setMessage({ text: result.message, ok: result.success });
            if (result.success) {
                setBody("");
                router.refresh();
            }
        } catch {
            setMessage({ text: "Something went wrong sending the note.", ok: false });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[20px] font-semibold text-[color:var(--dash-content-primary)]">Notes</h2>
                <button
                    type="button"
                    onClick={() => setFormOpen((v) => !v)}
                    className="inline-flex items-center gap-2 py-2 px-4 rounded-lg border border-[color:var(--dash-accent-line)] text-[color:var(--dash-accent-soft)] text-[14px] font-semibold hover:bg-[color:var(--dash-accent-wash)] active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-[18px]">{formOpen ? "close" : "chat"}</span>
                    {formOpen ? "Cancel" : "Send note"}
                </button>
            </div>

            {formOpen && (
                <div className="bg-[color:var(--dash-surface-sunken)] rounded-lg p-4 mb-5 flex flex-col gap-3 animate-[dashboard-fade-in_0.2s_ease]">
                    <textarea
                        autoFocus
                        className="auth-input w-full min-h-[100px] resize-y"
                        placeholder="Write a note…"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                    />
                    <button
                        type="button"
                        disabled={submitting || !body.trim()}
                        onClick={() => void handleSend()}
                        className="self-start inline-flex items-center gap-2 py-2.5 px-5 bg-[color:var(--dash-accent)] text-[color:var(--dash-content-on-accent)] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined ${submitting ? "animate-spin" : ""}`}>{submitting ? "progress_activity" : "send"}</span>
                        {submitting ? "Sending…" : "Send"}
                    </button>
                </div>
            )}

            {message && <p className={`text-[13px] mb-4 ${message.ok ? "text-[color:var(--dash-feedback-success)]" : "text-[color:var(--dash-accent-soft)]"}`}>{message.text}</p>}

            {initialNotes.length === 0 ? (
                <p className="text-[14px] text-[color:var(--dash-content-secondary)] opacity-70 py-4 text-center">No notes sent yet.</p>
            ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {initialNotes.map((n) => (
                        <div key={n.id} className="bg-[color:var(--dash-surface-sunken)] rounded-lg p-3">
                            <p className="text-[14px] text-[color:var(--dash-content-primary)] whitespace-pre-wrap">{n.body}</p>
                            <p className="text-[11px] text-[color:var(--dash-content-secondary)] opacity-60 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
