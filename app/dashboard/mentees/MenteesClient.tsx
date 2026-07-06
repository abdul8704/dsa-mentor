"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchUsers, sendInvite } from "@/app/actions/mentorship.actions";
import { createGroup, getGroupDetail, addMenteesToGroup, removeMenteeFromGroup, renameGroup, deleteGroup, assignProblemToGroup } from "@/app/actions/group.actions";
import { sendNoteToGroup, sendNoteToMentee } from "@/app/actions/note.actions";
import { MenteeTable } from "./MenteeTable";
import LoadingCard from "../components/LoadingCard";
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
    const [addMenteesTarget, setAddMenteesTarget] = useState<{ groupId: string; label: string } | null>(null);
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
                onOpenGroup={(id) => router.push(`/dashboard/mentees/groups/${id}`)}
                onAddMentees={(id, label) => setAddMenteesTarget({ groupId: id, label })}
                onManage={(id) => setManageGroupId(id)}
                onAssign={(id, label) => setAssignTarget({ groupId: id, label })}
                onNote={(id, label) => setNoteTarget({ kind: "group", id, label })}
            />

            {/* Mentee stats table */}
            <div className="space-y-3">
                <h2 className="text-[18px] font-semibold text-[#e5e1e4]">All mentees</h2>
                <MenteeTable
                    mentees={mentees}
                    onNote={(id, label) => setNoteTarget({ kind: "mentee", id, label })}
                    emptyState={
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
                                onClick={() => setInviteOpen(true)}
                                className="inline-flex items-center gap-2 py-2.5 px-5 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined">person_add</span>
                                Invite your first mentee
                            </button>
                        </div>
                    }
                />
            </div>

            {/* Pending sent invites */}
            {sentInvites.length > 0 && <SentInvitesList invites={sentInvites} />}

            {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onInvited={refresh} />}

            {createGroupOpen && (
                <CreateGroupModal mentees={mentees} onClose={() => setCreateGroupOpen(false)} onCreated={refresh} />
            )}

            {addMenteesTarget && (
                <AddMenteesModal
                    groupId={addMenteesTarget.groupId}
                    label={addMenteesTarget.label}
                    mentees={mentees}
                    onClose={() => setAddMenteesTarget(null)}
                    onAdded={refresh}
                />
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
                    mentees={mentees}
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
    onOpenGroup,
    onAddMentees,
    onManage,
    onAssign,
    onNote,
}: {
    groups: MenteeGroup[];
    onCreate: () => void;
    onOpenGroup: (id: string) => void;
    onAddMentees: (id: string, label: string) => void;
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
                        <div
                            key={g.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onOpenGroup(g.id)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onOpenGroup(g.id);
                                }
                            }}
                            className="glass-card rounded-xl p-4 flex flex-col gap-3 cursor-pointer hover:border-[rgba(255,181,157,0.35)] transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[15px] font-semibold text-[#e5e1e4] truncate">{g.name}</p>
                                    <p className="text-[12px] text-[#dfc0b6] opacity-70">
                                        {g.memberCount} {g.memberCount === 1 ? "mentee" : "mentees"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddMentees(g.id, g.name);
                                    }}
                                    className="shrink-0 text-[#dfc0b6] hover:text-[#ffb59d] transition-colors"
                                    aria-label={`Add mentees to ${g.name}`}
                                    title="Add mentees"
                                >
                                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAssign(g.id, g.name);
                                    }}
                                    className="flex-1 min-w-[86px] inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[12px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                                    Assign task
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onManage(g.id);
                                    }}
                                    className="flex-1 min-w-[86px] inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border border-white/10 text-[#dfc0b6] text-[12px] font-semibold hover:bg-white/5 hover:text-[#e5e1e4] active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[16px]">settings</span>
                                    Manage team
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onNote(g.id, g.name);
                                    }}
                                    className="flex-1 min-w-[86px] inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border border-white/10 text-[#dfc0b6] text-[12px] font-semibold hover:bg-white/5 hover:text-[#e5e1e4] active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[16px]">chat</span>
                                    Send message
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
// Add mentees to an existing group — pick from current mentees (with search)
// or search the wider user base and invite someone new.
// ─────────────────────────────────────────────────────────────────────────

function AddMenteesModal({
    groupId,
    label,
    mentees,
    onClose,
    onAdded,
}: {
    groupId: string;
    label: string;
    mentees: MenteeSummary[];
    onClose: () => void;
    onAdded: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
    const [added, setAdded] = useState(false);

    // New-user search (people who aren't mentees yet).
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [inviteBusy, setInviteBusy] = useState(false);
    const [inviteMessage, setInviteMessage] = useState<string | null>(null);
    const debounceRef = useRef<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const detail = await getGroupDetail(groupId);
            if (cancelled) return;
            if (detail) setMemberIds(new Set(detail.memberIds));
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [groupId]);

    useEffect(() => {
        if (!searchOpen) return;
        if (debounceRef.current) window.clearTimeout(debounceRef.current);

        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        debounceRef.current = window.setTimeout(async () => {
            setSearching(true);
            try {
                const res = await searchUsers(searchQuery);
                setSearchResults(res);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 350);

        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [searchQuery, searchOpen]);

    const nonMembers = mentees.filter((m) => !memberIds.has(m.userId));
    const filteredNonMembers = query.trim()
        ? nonMembers.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()))
        : nonMembers;

    function toggle(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleDone() {
        if (busy) return;
        if (selected.size === 0) {
            onClose();
            return;
        }
        setBusy(true);
        setMessage(null);
        try {
            const result = await addMenteesToGroup({ groupId, menteeIds: [...selected] });
            setMessage({ text: result.message, ok: result.success });
            if (result.success) {
                setAdded(true);
                onAdded();
                onClose();
            }
        } catch {
            setMessage({ text: "Could not add mentees to the group.", ok: false });
        } finally {
            setBusy(false);
        }
    }

    async function handleInvite(userId: string) {
        if (inviteBusy) return;
        setInviteBusy(true);
        setInviteMessage(null);
        try {
            const result = await sendInvite({ userId });
            setInviteMessage(result.message);
            if (result.success) {
                setSearchResults((prev) => prev.map((u) => (u.userId === userId ? { ...u, invitePending: true } : u)));
            }
        } catch {
            setInviteMessage("Something went wrong sending the invite.");
        } finally {
            setInviteBusy(false);
        }
    }

    function handleClose() {
        if (added) onAdded();
        onClose();
    }

    return (
        <ModalShell title={`Add mentees to "${label}"`} onClose={handleClose}>
            {loading ? (
                <p className="text-[13px] text-[#dfc0b6] opacity-70 py-4">Loading…</p>
            ) : (
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                            Your mentees ({selected.size} selected)
                        </label>
                        <input
                            className="auth-input w-full mt-1"
                            placeholder="Search your mentees by name…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {nonMembers.length === 0 ? (
                            <p className="text-[13px] text-[#dfc0b6] opacity-70 mt-2">Every mentee is already in this group.</p>
                        ) : filteredNonMembers.length === 0 ? (
                            <p className="text-[13px] text-[#dfc0b6] opacity-70 mt-2">No mentees match &quot;{query}&quot;.</p>
                        ) : (
                            <MenteePicker mentees={filteredNonMembers} selected={selected} onToggle={toggle} />
                        )}
                    </div>

                    <div className="pt-3 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => setSearchOpen((v) => !v)}
                            className="flex items-center gap-1.5 text-[13px] font-semibold text-[#ffb59d] hover:opacity-80 transition-opacity"
                        >
                            <span className="material-symbols-outlined text-[16px]">{searchOpen ? "expand_less" : "search"}</span>
                            Search for new users
                        </button>

                        {searchOpen && (
                            <div className="mt-2">
                                <input
                                    autoFocus
                                    className="auth-input w-full"
                                    placeholder="Search by name or platform handle…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <p className="text-[11px] text-[#dfc0b6] opacity-60 mt-1">
                                    New users need to accept an invite before they can be added to a group.
                                </p>
                                <div className="mt-2 max-h-[220px] overflow-y-auto space-y-2">
                                    {searching && <p className="text-[13px] text-[#dfc0b6] opacity-70 py-2">Searching…</p>}
                                    {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                                        <p className="text-[13px] text-[#dfc0b6] opacity-70 py-2">No users found.</p>
                                    )}
                                    {searchResults.map((u) => (
                                        <div key={u.userId} className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5">
                                            <div className="w-8 h-8 rounded-full bg-[#353437] flex items-center justify-center shrink-0">
                                                <span className="text-[#ffb59d] text-[13px] font-bold">{u.name.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] text-[#e5e1e4] truncate">{u.name}</p>
                                            </div>
                                            {u.alreadyConnected ? (
                                                <span className="text-[11px] text-[#dfc0b6] opacity-70 shrink-0">Already a mentee</span>
                                            ) : u.invitePending ? (
                                                <span className="text-[11px] text-[#dfc0b6] opacity-70 shrink-0">Invited</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={inviteBusy}
                                                    onClick={() => void handleInvite(u.userId)}
                                                    className="shrink-0 inline-flex items-center gap-1 py-1 px-2.5 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[12px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">person_add</span>
                                                    Invite
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {inviteMessage && <p className="text-[12px] text-[#dfc0b6] mt-2">{inviteMessage}</p>}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        {message && <p className={`text-[13px] mr-auto ${message.ok ? "text-[#4edea3]" : "text-[#ffb59d]"}`}>{message.text}</p>}
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDone()}
                            className="inline-flex items-center gap-2 py-2.5 px-5 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                        >
                            <span className={`material-symbols-outlined ${busy ? "animate-spin" : ""}`}>{busy ? "progress_activity" : "check"}</span>
                            {busy ? "Adding…" : selected.size > 0 ? `Add ${selected.size} & Done` : "Done"}
                        </button>
                    </div>
                </div>
            )}
        </ModalShell>
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
        <ModalShell title="Manage team" onClose={handleClose}>
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

                    <p className="text-[11px] text-[#dfc0b6] opacity-60 -mt-2">
                        Use the &quot;Add mentees&quot; icon on the group card to add more members.
                    </p>

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

export function NoteModal({
    target,
    mentees,
    onClose,
    onSent,
}: {
    target: NoteTarget;
    mentees: MenteeSummary[];
    onClose: () => void;
    onSent: () => void;
}) {
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

    // Group notes can be sent to a subset of the group's current members.
    const [loadingMembers, setLoadingMembers] = useState(target.kind === "group");
    const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (target.kind !== "group") return;
        let cancelled = false;
        (async () => {
            const detail = await getGroupDetail(target.id);
            if (cancelled) return;
            if (detail) {
                const nameById = new Map(mentees.map((m) => [m.userId, m.name]));
                const memberList = detail.memberIds.map((id) => ({ id, name: nameById.get(id) ?? "Unknown mentee" }));
                setMembers(memberList);
                setSelected(new Set(detail.memberIds));
            }
            setLoadingMembers(false);
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target.kind, target.id]);

    function toggleMember(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleSend() {
        if (busy || !body.trim()) return;
        if (target.kind === "group" && selected.size === 0) return;
        setBusy(true);
        setMessage(null);
        try {
            const result =
                target.kind === "group" ? await sendNoteToGroup(target.id, body, [...selected]) : await sendNoteToMentee(target.id, body);
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
        <ModalShell title={`Send message to ${target.label}`} onClose={onClose}>
            <div className="flex flex-col gap-3">
                {target.kind === "group" && (
                    <div>
                        <label className="text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                            Send to ({selected.size}/{members.length})
                        </label>
                        {loadingMembers ? (
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
                                                checked
                                                    ? "bg-[rgba(255,181,157,0.1)] border border-[rgba(255,181,157,0.4)]"
                                                    : "bg-white/5 border border-transparent hover:bg-white/[0.07]"
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
                )}
                <textarea
                    autoFocus
                    className="auth-input w-full min-h-[120px] resize-y"
                    placeholder="Write a message…"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                />
                {target.kind === "group" && (
                    <p className="text-[11px] text-[#dfc0b6] opacity-60">
                        This sends the same message individually to each selected mentee.
                    </p>
                )}
                <button
                    type="button"
                    disabled={busy || !body.trim() || (target.kind === "group" && selected.size === 0)}
                    onClick={() => void handleSend()}
                    className="self-start inline-flex items-center gap-2 py-2.5 px-5 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined ${busy ? "animate-spin" : ""}`}>{busy ? "progress_activity" : "send"}</span>
                    {busy ? "Sending…" : "Send message"}
                </button>
                {message && <p className={`text-[13px] ${message.ok ? "text-[#4edea3]" : "text-[#ffb59d]"}`}>{message.text}</p>}
            </div>
        </ModalShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared modal shell
// ─────────────────────────────────────────────────────────────────────────

export function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
        <ModalShell title="Invite a mentee" onClose={() => !busy && onClose()}>
            <div className="relative">
                {busy && (
                    <div className="absolute -inset-2 z-10 flex items-center justify-center bg-[rgba(9,9,11,0.82)] backdrop-blur-sm rounded-xl">
                        <LoadingCard title="Sending invite…" subtitle="This will only take a moment" size="sm" />
                    </div>
                )}
                <div className={busy ? "opacity-30 pointer-events-none select-none" : ""}>
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
                </div>
            </div>
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
