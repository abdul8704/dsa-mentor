"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchUsers, sendInvite } from "@/app/actions/mentorship.actions";
import { createGroup, getGroupDetail, addMenteesToGroup, removeMenteeFromGroup, renameGroup, deleteGroup, assignProblemToGroup } from "@/app/actions/group.actions";
import { sendNoteToGroup, sendNoteToMentee } from "@/app/actions/note.actions";
import Last7DaysChart from "../components/Last7DaysChart";
import type { MenteeSummary, SentInvite, UserSearchResult, MenteeGroup } from "@/app/lib/types/mentorship";

interface MenteesClientProps {
    mentees: MenteeSummary[];
    groups: MenteeGroup[];
    sentInvites: SentInvite[];
}

type NoteTarget = { kind: "group"; id: string; label: string } | { kind: "mentee"; id: string; label: string };
type AssignTarget = { groupId: string; label: string };

/**
 * Mentor roster page: groups (batch-assign tasks/notes to mentees without
 * mentees ever knowing they're grouped), a stats table of every mentee, and
 * the invite flow.
 */
export default function MenteesClient({ mentees, groups, sentInvites }: MenteesClientProps) {
    const router = useRouter();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [createGroupOpen, setCreateGroupOpen] = useState(false);
    const [manageGroupId, setManageGroupId] = useState<string | null>(null);
    const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
    const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null);

    function refresh() {
        router.refresh();
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-[28px] lg:text-[32px] font-semibold tracking-[-0.02em] text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-sans)" }}>
                        Your Mentees
                    </h1>
                    <p className="text-[#dfc0b6] opacity-80 mt-1">
                        {mentees.length} active {mentees.length === 1 ? "mentee" : "mentees"}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    className="inline-flex items-center justify-center gap-2 py-3 px-5 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">person_add</span>
                    Invite mentee
                </button>
            </div>

            {/* Groups */}
            <GroupsSection
                groups={groups}
                onCreate={() => setCreateGroupOpen(true)}
                onManage={(id) => setManageGroupId(id)}
                onAssign={(id, label) => setAssignTarget({ groupId: id, label })}
                onNote={(id, label) => setNoteTarget({ kind: "group", id, label })}
            />

            {/* Mentee stats table */}
            <MenteeTable mentees={mentees} onInvite={() => setInviteOpen(true)} onNote={(id, label) => setNoteTarget({ kind: "mentee", id, label })} />

            {/* Pending sent invites */}
            {sentInvites.length > 0 && <SentInvitesList invites={sentInvites} />}

            {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onInvited={refresh} />}

            {createGroupOpen && (
                <CreateGroupModal mentees={mentees} onClose={() => setCreateGroupOpen(false)} onCreated={refresh} />
            )}

            {manageGroupId && (
                <ManageGroupModal
                    groupId={manageGroupId}
                    mentees={mentees}
                    onClose={() => setManageGroupId(null)}
                    onChanged={refresh}
                />
            )}

            {assignTarget && (
                <AssignToGroupModal
                    groupId={assignTarget.groupId}
                    label={assignTarget.label}
                    mentees={mentees}
                    onClose={() => setAssignTarget(null)}
                    onAssigned={refresh}
                />
            )}

            {noteTarget && (
                <NoteModal
                    target={noteTarget}
                    onClose={() => setNoteTarget(null)}
                    onSent={refresh}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Groups section
// ─────────────────────────────────────────────────────────────────────────

function GroupsSection({
    groups,
    onCreate,
    onManage,
    onAssign,
    onNote,
}: {
    groups: MenteeGroup[];
    onCreate: () => void;
    onManage: (id: string) => void;
    onAssign: (id: string, label: string) => void;
    onNote: (id: string, label: string) => void;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-[#e5e1e4]">Groups</h2>
                {groups.length > 0 && (
                    <button
                        type="button"
                        onClick={onCreate}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[13px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        New group
                    </button>
                )}
            </div>

            {groups.length === 0 ? (
                <div className="glass-card rounded-xl p-8 flex flex-col items-center text-center gap-3">
                    <span className="material-symbols-outlined text-[36px] text-[#ffb59d] opacity-70">workspaces</span>
                    <div>
                        <p className="text-[15px] font-semibold text-[#e5e1e4]">No groups yet</p>
                        <p className="text-[#dfc0b6] opacity-80 mt-1 max-w-md text-[13px]">
                            Group mentees together to assign tasks and send notes to all of them at once. Mentees never see
                            which group they&apos;re in.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCreate}
                        className="inline-flex items-center gap-2 py-2 px-4 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Create a group
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {groups.map((g) => (
                        <div key={g.id} className="glass-card rounded-xl p-4 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[15px] font-semibold text-[#e5e1e4] truncate">{g.name}</p>
                                    <p className="text-[12px] text-[#dfc0b6] opacity-70">
                                        {g.memberCount} {g.memberCount === 1 ? "mentee" : "mentees"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onManage(g.id)}
                                    className="shrink-0 text-[#dfc0b6] hover:text-[#ffb59d] transition-colors"
                                    aria-label={`Manage ${g.name}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">settings</span>
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onAssign(g.id, g.name)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[12px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                                    Assign task
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onNote(g.id, g.name)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border border-white/10 text-[#dfc0b6] text-[12px] font-semibold hover:bg-white/5 hover:text-[#e5e1e4] active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[16px]">chat</span>
                                    Send note
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Mentee stats table
// ─────────────────────────────────────────────────────────────────────────

const TABLE_GRID_COLS = "minmax(170px,1.1fr) minmax(220px,1.6fr) 110px minmax(150px,1.1fr) minmax(150px,1fr) 40px";

function MenteeTable({
    mentees,
    onInvite,
    onNote,
}: {
    mentees: MenteeSummary[];
    onInvite: () => void;
    onNote: (menteeId: string, label: string) => void;
}) {
    return (
        <div className="space-y-3">
            <h2 className="text-[18px] font-semibold text-[#e5e1e4]">All mentees</h2>

            {mentees.length === 0 ? (
                <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center gap-4">
                    <span className="material-symbols-outlined text-[48px] text-[#ffb59d] opacity-70">group</span>
                    <div>
                        <p className="text-[18px] font-semibold text-[#e5e1e4]">No mentees yet</p>
                        <p className="text-[#dfc0b6] opacity-80 mt-1 max-w-md">
                            Invite students by searching for their account or entering their email. Once they accept, their
                            progress appears here.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onInvite}
                        className="inline-flex items-center gap-2 py-2.5 px-5 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined">person_add</span>
                        Invite your first mentee
                    </button>
                </div>
            ) : (
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
            )}
        </div>
    );
}

function MenteeRow({ mentee, onNote }: { mentee: MenteeSummary; onNote: () => void }) {
    const isInactive = mentee.daysSinceActive === null || mentee.daysSinceActive > 7;

    return (
        <div
            className="grid gap-3 px-5 py-4 items-center border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors min-h-[84px]"
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
                <div className="flex-1 min-w-0 h-16">
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

            {/* Quick action */}
            <button
                type="button"
                onClick={onNote}
                className="justify-self-end text-[#dfc0b6] hover:text-[#ffb59d] transition-colors"
                aria-label={`Send note to ${mentee.name}`}
                title="Send note"
            >
                <span className="material-symbols-outlined text-[20px]">chat</span>
            </button>
        </div>
    );
}

function TagPill({ tag }: { tag: string }) {
    return (
        <span className="text-[11px] font-medium text-[#e5e1e4] bg-white/5 border border-white/10 px-2 py-1 rounded-full whitespace-nowrap">
            {tag}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Create group modal
// ─────────────────────────────────────────────────────────────────────────

function CreateGroupModal({
    mentees,
    onClose,
    onCreated,
}: {
    mentees: MenteeSummary[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const [name, setName] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    function toggle(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleCreate() {
        if (busy || !name.trim()) return;
        setBusy(true);
        setMessage(null);
        try {
            const result = await createGroup({ name, menteeIds: [...selected] });
            setMessage(result.message);
            if (result.success) {
                onCreated();
                onClose();
            }
        } catch {
            setMessage("Something went wrong creating the group.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <ModalShell title="Create a group" onClose={onClose}>
            <div className="flex flex-col gap-4">
                <div>
                    <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                        Group name
                    </label>
                    <input
                        autoFocus
                        className="auth-input w-full mt-1"
                        placeholder="e.g. Weekend Cohort"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                        Add mentees ({selected.size} selected)
                    </label>
                    <MenteePicker mentees={mentees} selected={selected} onToggle={toggle} />
                </div>

                <button
                    type="button"
                    disabled={busy || !name.trim()}
                    onClick={() => void handleCreate()}
                    className="self-start inline-flex items-center gap-2 py-2.5 px-5 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined ${busy ? "animate-spin" : ""}`}>{busy ? "progress_activity" : "add"}</span>
                    {busy ? "Creating…" : "Create group"}
                </button>

                {message && <p className="text-[13px] text-[#dfc0b6]">{message}</p>}
            </div>
        </ModalShell>
    );
}

function MenteePicker({
    mentees,
    selected,
    onToggle,
}: {
    mentees: MenteeSummary[];
    selected: Set<string>;
    onToggle: (id: string) => void;
}) {
    if (mentees.length === 0) {
        return <p className="text-[13px] text-[#dfc0b6] opacity-70 mt-2">Invite mentees first, then group them.</p>;
    }
    return (
        <div className="mt-2 max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
            {mentees.map((m) => {
                const checked = selected.has(m.userId);
                return (
                    <button
                        type="button"
                        key={m.userId}
                        onClick={() => onToggle(m.userId)}
                        className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-all ${
                            checked ? "bg-[rgba(255,181,157,0.1)] border border-[rgba(255,181,157,0.4)]" : "bg-white/5 border border-transparent hover:bg-white/[0.07]"
                        }`}
                    >
                        <span
                            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                                checked ? "bg-[#f47144] border-[#f47144]" : "border-white/20"
                            }`}
                        >
                            {checked && <span className="material-symbols-outlined text-[14px] text-[#5d1800]">check</span>}
                        </span>
                        <span className="text-[13px] text-[#e5e1e4] truncate">{m.name}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Manage group modal (rename, edit members, delete)
// ─────────────────────────────────────────────────────────────────────────

function ManageGroupModal({
    groupId,
    mentees,
    onClose,
    onChanged,
}: {
    groupId: string;
    mentees: MenteeSummary[];
    onClose: () => void;
    onChanged: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
    const [toAdd, setToAdd] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [changed, setChanged] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const detail = await getGroupDetail(groupId);
            if (cancelled) return;
            if (detail) {
                setName(detail.name);
                setMemberIds(new Set(detail.memberIds));
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [groupId]);

    const nameById = new Map(mentees.map((m) => [m.userId, m.name]));
    const members = [...memberIds].map((id) => ({ id, name: nameById.get(id) ?? "Unknown mentee" }));
    const nonMembers = mentees.filter((m) => !memberIds.has(m.userId));

    function toggleAdd(id: string) {
        setToAdd((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleRemove(menteeId: string) {
        if (busy) return;
        setBusy(true);
        setMessage(null);
        try {
            const result = await removeMenteeFromGroup(groupId, menteeId);
            if (result.success) {
                setMemberIds((prev) => {
                    const next = new Set(prev);
                    next.delete(menteeId);
                    return next;
                });
                setChanged(true);
            } else {
                setMessage(result.message);
            }
        } catch {
            setMessage("Could not remove that mentee.");
        } finally {
            setBusy(false);
        }
    }

    async function handleAdd() {
        if (busy || toAdd.size === 0) return;
        setBusy(true);
        setMessage(null);
        try {
            const result = await addMenteesToGroup({ groupId, menteeIds: [...toAdd] });
            setMessage(result.message);
            if (result.success) {
                setMemberIds((prev) => new Set([...prev, ...toAdd]));
                setToAdd(new Set());
                setChanged(true);
            }
        } catch {
            setMessage("Could not add mentees to the group.");
        } finally {
            setBusy(false);
        }
    }

    async function handleRename() {
        if (busy || !name.trim()) return;
        setBusy(true);
        setMessage(null);
        try {
            const result = await renameGroup(groupId, name);
            setMessage(result.message);
            if (result.success) setChanged(true);
        } catch {
            setMessage("Could not rename the group.");
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete() {
        if (busy) return;
        setBusy(true);
        setMessage(null);
        try {
            const result = await deleteGroup(groupId);
            setMessage(result.message);
            if (result.success) {
                onChanged();
                onClose();
            }
        } catch {
            setMessage("Could not delete the group.");
        } finally {
            setBusy(false);
        }
    }

    function handleClose() {
        if (changed) onChanged();
        onClose();
    }

    return (
        <ModalShell title="Manage group" onClose={handleClose}>
            {loading ? (
                <p className="text-[13px] text-[#dfc0b6] opacity-70 py-4">Loading…</p>
            ) : (
                <div className="flex flex-col gap-5">
                    <div>
                        <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                            Group name
                        </label>
                        <div className="flex gap-2 mt-1">
                            <input className="auth-input w-full" value={name} onChange={(e) => setName(e.target.value)} />
                            <button
                                type="button"
                                disabled={busy || !name.trim()}
                                onClick={() => void handleRename()}
                                className="shrink-0 inline-flex items-center gap-1.5 py-2 px-3 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[13px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                            Current members ({members.length})
                        </label>
                        {members.length === 0 ? (
                            <p className="text-[13px] text-[#dfc0b6] opacity-70 mt-2">No mentees in this group yet.</p>
                        ) : (
                            <div className="mt-2 max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
                                {members.map((m) => (
                                    <div key={m.id} className="flex items-center justify-between gap-3 bg-white/5 rounded-lg p-2.5">
                                        <span className="text-[13px] text-[#e5e1e4] truncate">{m.name}</span>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => void handleRemove(m.id)}
                                            className="shrink-0 text-[#dfc0b6] hover:text-red-300 transition-colors disabled:opacity-50"
                                            aria-label={`Remove ${m.name} from group`}
                                            title="Remove from group"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">person_remove</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                            Add mentees ({toAdd.size} selected)
                        </label>
                        {nonMembers.length === 0 ? (
                            <p className="text-[13px] text-[#dfc0b6] opacity-70 mt-2">Every mentee is already in this group.</p>
                        ) : (
                            <>
                                <MenteePicker mentees={nonMembers} selected={toAdd} onToggle={toggleAdd} />
                                <button
                                    type="button"
                                    disabled={busy || toAdd.size === 0}
                                    onClick={() => void handleAdd()}
                                    className="mt-2 inline-flex items-center gap-1.5 py-2 px-4 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[13px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                                    Add selected
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDelete()}
                            className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg border border-red-500/30 text-red-300 text-[13px] font-semibold hover:bg-red-500/10 active:scale-95 transition-all disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            Delete group
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex items-center gap-2 py-2.5 px-5 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all"
                        >
                            Done
                        </button>
                    </div>

                    {message && <p className="text-[13px] text-[#dfc0b6]">{message}</p>}
                </div>
            )}
        </ModalShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Assign task to group modal
// ─────────────────────────────────────────────────────────────────────────

function AssignToGroupModal({
    groupId,
    label,
    mentees,
    onClose,
    onAssigned,
}: {
    groupId: string;
    label: string;
    mentees: MenteeSummary[];
    onClose: () => void;
    onAssigned: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [url, setUrl] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const detail = await getGroupDetail(groupId);
            if (cancelled) return;
            if (detail) {
                const nameById = new Map(mentees.map((m) => [m.userId, m.name]));
                const memberList = detail.memberIds.map((id) => ({ id, name: nameById.get(id) ?? "Unknown mentee" }));
                setMembers(memberList);
                setSelected(new Set(detail.memberIds));
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId]);

    function toggleMember(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleAssign() {
        if (busy || !url.trim() || selected.size === 0) return;
        setBusy(true);
        setMessage(null);
        try {
            const result = await assignProblemToGroup({
                groupId,
                url,
                dueDate: dueDate || null,
                note: note || null,
                menteeIds: [...selected],
            });
            setMessage({ text: result.message, ok: result.success });
            if (result.success) {
                onAssigned();
                onClose();
            }
        } catch {
            setMessage({ text: "Something went wrong assigning the problem.", ok: false });
        } finally {
            setBusy(false);
        }
    }

    return (
        <ModalShell title={`Assign task to "${label}"`} onClose={onClose}>
            <div className="flex flex-col gap-3">
                <div>
                    <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                        Assign to ({selected.size}/{members.length})
                    </label>
                    {loading ? (
                        <p className="text-[13px] text-[#dfc0b6] opacity-70 mt-2">Loading members…</p>
                    ) : members.length === 0 ? (
                        <p className="text-[13px] text-[#dfc0b6] opacity-70 mt-2">This group has no mentees yet.</p>
                    ) : (
                        <div className="mt-2 max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
                            {members.map((m) => {
                                const checked = selected.has(m.id);
                                return (
                                    <button
                                        type="button"
                                        key={m.id}
                                        onClick={() => toggleMember(m.id)}
                                        className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-all ${
                                            checked ? "bg-[rgba(255,181,157,0.1)] border border-[rgba(255,181,157,0.4)]" : "bg-white/5 border border-transparent hover:bg-white/[0.07]"
                                        }`}
                                    >
                                        <span
                                            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                                                checked ? "bg-[#f47144] border-[#f47144]" : "border-white/20"
                                            }`}
                                        >
                                            {checked && <span className="material-symbols-outlined text-[14px] text-[#5d1800]">check</span>}
                                        </span>
                                        <span className="text-[13px] text-[#e5e1e4] truncate">{m.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div>
                    <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                        Problem URL
                    </label>
                    <input
                        autoFocus
                        className="auth-input w-full mt-1"
                        placeholder="https://leetcode.com/problems/two-sum/"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    <p className="text-[11px] text-[#dfc0b6] opacity-60 mt-1">
                        Assigns to the selected members above. Supports LeetCode, Codeforces, and AtCoder links.
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
                    disabled={busy || !url.trim() || selected.size === 0}
                    onClick={() => void handleAssign()}
                    className="self-start inline-flex items-center gap-2 py-2.5 px-5 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined ${busy ? "animate-spin" : ""}`}>{busy ? "progress_activity" : "assignment_turned_in"}</span>
                    {busy ? "Assigning…" : `Assign to ${selected.size} mentee${selected.size === 1 ? "" : "s"}`}
                </button>
                {message && <p className={`text-[13px] ${message.ok ? "text-[#4edea3]" : "text-[#ffb59d]"}`}>{message.text}</p>}
            </div>
        </ModalShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Note modal (works for a single mentee or a whole group)
// ─────────────────────────────────────────────────────────────────────────

function NoteModal({ target, onClose, onSent }: { target: NoteTarget; onClose: () => void; onSent: () => void }) {
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

    async function handleSend() {
        if (busy || !body.trim()) return;
        setBusy(true);
        setMessage(null);
        try {
            const result = target.kind === "group" ? await sendNoteToGroup(target.id, body) : await sendNoteToMentee(target.id, body);
            setMessage({ text: result.message, ok: result.success });
            if (result.success) {
                onSent();
                onClose();
            }
        } catch {
            setMessage({ text: "Something went wrong sending the note.", ok: false });
        } finally {
            setBusy(false);
        }
    }

    return (
        <ModalShell title={`Send note to ${target.label}`} onClose={onClose}>
            <div className="flex flex-col gap-3">
                <textarea
                    autoFocus
                    className="auth-input w-full min-h-[120px] resize-y"
                    placeholder="Write a note…"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                />
                {target.kind === "group" && (
                    <p className="text-[11px] text-[#dfc0b6] opacity-60">
                        This sends the same note individually to every mentee currently in this group.
                    </p>
                )}
                <button
                    type="button"
                    disabled={busy || !body.trim()}
                    onClick={() => void handleSend()}
                    className="self-start inline-flex items-center gap-2 py-2.5 px-5 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined ${busy ? "animate-spin" : ""}`}>{busy ? "progress_activity" : "send"}</span>
                    {busy ? "Sending…" : "Send note"}
                </button>
                {message && <p className={`text-[13px] ${message.ok ? "text-[#4edea3]" : "text-[#ffb59d]"}`}>{message.text}</p>}
            </div>
        </ModalShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared modal shell
// ─────────────────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div
            className="fixed inset-0 z-80 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[dashboard-fade-in_0.2s_ease]"
            role="presentation"
            onClick={onClose}
        >
            <div
                className="glass-card rounded-2xl w-full max-w-[520px] p-6 max-h-[90vh] overflow-y-auto"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[20px] font-semibold text-[#e5e1e4]">{title}</h2>
                    <button type="button" onClick={onClose} className="text-[#dfc0b6] hover:text-white transition-colors" aria-label="Close">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Sent invites list
// ─────────────────────────────────────────────────────────────────────────

function SentInvitesList({ invites }: { invites: SentInvite[] }) {
    return (
        <div className="glass-card rounded-xl p-6">
            <h2 className="text-[18px] font-semibold text-[#e5e1e4] mb-4">Sent invitations</h2>
            <div className="space-y-2">
                {invites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <span className="text-[14px] text-[#e5e1e4] truncate">{inv.inviteeEmail}</span>
                        <span className={`text-[12px] font-semibold uppercase tracking-wide ${statusColor(inv.status)}`}>
                            {inv.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function statusColor(status: SentInvite["status"]): string {
    switch (status) {
        case "accepted":
            return "text-[#4edea3]";
        case "declined":
        case "expired":
            return "text-[#dfc0b6] opacity-60";
        default:
            return "text-[#ffb59d]";
    }
}

/** Invite modal: search existing users OR invite by raw email. */
function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
    const [tab, setTab] = useState<"search" | "email">("search");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UserSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const debounceRef = useRef<number | null>(null);

    // Debounced user search.
    useEffect(() => {
        if (tab !== "search") return;
        if (debounceRef.current) window.clearTimeout(debounceRef.current);

        if (query.trim().length < 2) {
            setResults([]);
            return;
        }

        debounceRef.current = window.setTimeout(async () => {
            setSearching(true);
            try {
                const res = await searchUsers(query);
                setResults(res);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 350);

        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [query, tab]);

    async function invite(params: { userId?: string; email?: string }) {
        if (busy) return;
        setBusy(true);
        setMessage(null);
        setInviteUrl(null);
        setCopied(false);
        try {
            const result = await sendInvite(params);
            setMessage(result.message);
            if (result.success) {
                setInviteUrl(result.inviteUrl ?? null);
                onInvited();
                if (params.email) setEmail("");
            }
        } catch {
            setMessage("Something went wrong sending the invite.");
        } finally {
            setBusy(false);
        }
    }

    async function copyLink() {
        if (!inviteUrl) return;
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard API can fail (e.g. insecure context); leave link visible to copy manually.
            setCopied(false);
        }
    }

    return (
        <ModalShell title="Invite a mentee" onClose={onClose}>
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <TabButton active={tab === "search"} onClick={() => setTab("search")} icon="search" label="Search users" />
                <TabButton active={tab === "email"} onClick={() => setTab("email")} icon="mail" label="Invite by email" />
            </div>

            {tab === "search" ? (
                <div>
                    <input
                        autoFocus
                        className="auth-input w-full"
                        placeholder="Search by name or platform handle…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="mt-3 max-h-[280px] overflow-y-auto space-y-2">
                        {searching && <p className="text-[13px] text-[#dfc0b6] opacity-70 py-2">Searching…</p>}
                        {!searching && query.trim().length >= 2 && results.length === 0 && (
                            <p className="text-[13px] text-[#dfc0b6] opacity-70 py-2">No users found.</p>
                        )}
                        {results.map((u) => (
                            <div key={u.userId} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                                <div className="w-9 h-9 rounded-full bg-[#353437] flex items-center justify-center shrink-0">
                                    <span className="text-[#ffb59d] font-bold">{u.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] text-[#e5e1e4] truncate">{u.name}</p>
                                    <p className="text-[11px] text-[#dfc0b6] opacity-70 truncate">
                                        {Object.entries(u.handles).map(([p, h]) => `${p}: ${h}`).join("  ·  ") || "No handles"}
                                    </p>
                                </div>
                                <InviteRowButton user={u} busy={busy} onInvite={() => invite({ userId: u.userId })} />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <input
                        autoFocus
                        type="email"
                        className="auth-input w-full"
                        placeholder="student@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button
                        type="button"
                        disabled={busy || !email.includes("@")}
                        onClick={() => void invite({ email })}
                        className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined ${busy ? "animate-spin" : ""}`}>{busy ? "progress_activity" : "send"}</span>
                        Send invite
                    </button>
                </div>
            )}

            {message && <p className="text-[13px] text-[#dfc0b6] mt-3">{message}</p>}

            {/* Shareable invite link — always available as a fallback to email. */}
            {inviteUrl && (
                <div className="mt-3 flex items-center gap-2 bg-white/5 rounded-lg p-2">
                    <span className="text-[12px] text-[#dfc0b6] truncate flex-1 px-1" title={inviteUrl}>
                        {inviteUrl}
                    </span>
                    <button
                        type="button"
                        onClick={() => void copyLink()}
                        className="shrink-0 inline-flex items-center gap-1 py-1.5 px-3 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[12px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
                        {copied ? "Copied" : "Copy link"}
                    </button>
                </div>
            )}
        </ModalShell>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-semibold transition-all ${
                active ? "bg-[rgba(255,181,157,0.12)] text-[#ffb59d]" : "text-[#dfc0b6] hover:bg-white/5"
            }`}
        >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
        </button>
    );
}

function InviteRowButton({ user, busy, onInvite }: { user: UserSearchResult; busy: boolean; onInvite: () => void }) {
    if (user.alreadyConnected) {
        return <span className="text-[12px] text-[#4edea3] font-semibold shrink-0">Connected</span>;
    }
    if (user.invitePending) {
        return <span className="text-[12px] text-[#dfc0b6] opacity-70 shrink-0">Invited</span>;
    }
    return (
        <button
            type="button"
            disabled={busy}
            onClick={onInvite}
            className="shrink-0 inline-flex items-center gap-1 py-1.5 px-3 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[13px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all disabled:opacity-50"
        >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Invite
        </button>
    );
}
