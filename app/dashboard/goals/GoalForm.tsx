"use client";

import { useEffect, useState } from "react";
import { createGoal, getRevisionCandidates, updateGoal } from "@/app/actions/goals.actions";
import { ModalShell } from "../mentees/MenteesClient";
import type { GoalInput, GoalKind, GoalRecurrence, GoalView, RevisionCandidate } from "@/app/lib/types/goals";

const PLATFORMS = [
    { id: "leetcode", label: "LeetCode" },
    { id: "codeforces", label: "Codeforces" },
    { id: "atcoder", label: "AtCoder" },
    { id: "cses", label: "CSES" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function Label({ children }: { children: React.ReactNode }) {
    return (
        <label className="block text-[12px] uppercase tracking-wide text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
            {children}
        </label>
    );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`py-1.5 px-3 rounded-lg text-[13px] font-semibold transition-all active:scale-95 border ${
                active ? "border-[#ffb59d] bg-[rgba(255,181,157,0.12)] text-[#ffb59d]" : "border-white/10 text-[#dfc0b6] hover:bg-white/5"
            }`}
        >
            {children}
        </button>
    );
}

/** Create/edit modal for both goal types. The type is fixed once a goal exists. */
export default function GoalForm({
    ownerId,
    goal,
    onClose,
    onSaved,
}: {
    ownerId: string;
    goal: GoalView | null;
    onClose: () => void;
    onSaved: (message: string) => void;
}) {
    const [kind, setKind] = useState<GoalKind>(goal?.kind ?? "solve");
    const [name, setName] = useState(goal?.name ?? "");
    const [startDate, setStartDate] = useState(goal?.startDate ?? todayIso());
    const [endDate, setEndDate] = useState(goal ? goal.endDate ?? "" : plusDays(todayIso(), 6));
    const [recurrence, setRecurrence] = useState<GoalRecurrence>(goal?.recurrence ?? "none");
    const [targetCount, setTargetCount] = useState(String(goal?.kind === "solve" ? goal.targetCount : 10));
    const [platforms, setPlatforms] = useState<string[]>(goal?.platforms ?? []);
    const [includeAlreadySolved, setIncludeAlreadySolved] = useState(goal?.includeAlreadySolved ?? false);
    const [selected, setSelected] = useState<Map<string, { title: string; platform: string }>>(
        () => new Map(goal?.kind === "revise" ? goal.problems.map((p) => [p.problemId, { title: p.title, platform: p.platform }]) : [])
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isRepeating = kind === "solve" && recurrence !== "none";

    // A repeating goal's end date means "repeat until", so it starts empty
    // (forever); a one-off goal needs a due date, so give it a week.
    function chooseRecurrence(next: GoalRecurrence) {
        if (next !== "none" && recurrence === "none" && !goal) setEndDate("");
        if (next === "none" && !endDate) setEndDate(plusDays(startDate, 6));
        setRecurrence(next);
    }

    async function handleSubmit() {
        setSaving(true);
        setError(null);
        const input: GoalInput = {
            name,
            kind,
            startDate,
            endDate: endDate || null,
            recurrence: kind === "solve" ? recurrence : "none",
            targetCount: kind === "solve" ? Number(targetCount) : null,
            platforms: kind === "solve" && platforms.length > 0 ? platforms : null,
            includeAlreadySolved: kind === "solve" && includeAlreadySolved,
            problemIds: kind === "revise" ? [...selected.keys()] : [],
        };
        try {
            const result = goal ? await updateGoal(goal.id, input) : await createGoal(ownerId, input);
            if (result.success) onSaved(result.message);
            else setError(result.message);
        } catch {
            setError("Could not save the goal. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <ModalShell title={goal ? "Edit goal" : "New goal"} onClose={onClose}>
            <div className="space-y-4">
                {!goal && (
                    <div className="grid grid-cols-2 gap-2">
                        <Chip active={kind === "solve"} onClick={() => setKind("solve")}>
                            Solve problems
                        </Chip>
                        <Chip active={kind === "revise"} onClick={() => setKind("revise")}>
                            Revise problems
                        </Chip>
                    </div>
                )}

                <div>
                    <Label>Name</Label>
                    <input
                        className="auth-input w-full mt-1"
                        placeholder={kind === "solve" ? "18 LeetCode problems this week" : "Revise DP classics"}
                        value={name}
                        maxLength={120}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {kind === "solve" && (
                    <>
                        <div>
                            <Label>Target (problems)</Label>
                            <input
                                type="number"
                                min={1}
                                max={10000}
                                className="auth-input w-full mt-1"
                                value={targetCount}
                                onChange={(e) => setTargetCount(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Platforms</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                <Chip active={platforms.length === 0} onClick={() => setPlatforms([])}>
                                    All
                                </Chip>
                                {PLATFORMS.map((p) => (
                                    <Chip
                                        key={p.id}
                                        active={platforms.includes(p.id)}
                                        onClick={() =>
                                            setPlatforms((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id]))
                                        }
                                    >
                                        {p.label}
                                    </Chip>
                                ))}
                            </div>
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="mt-1 accent-[#f47144]"
                                checked={includeAlreadySolved}
                                onChange={(e) => setIncludeAlreadySolved(e.target.checked)}
                            />
                            <span className="text-[14px] text-[#e5e1e4]">
                                Count re-solves of problems already solved before
                                <span className="block text-[12px] text-[#dfc0b6] opacity-70">
                                    Off: only problems solved for the first time count.
                                </span>
                            </span>
                        </label>

                        <div>
                            <Label>Repeat</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                <Chip active={recurrence === "none"} onClick={() => chooseRecurrence("none")}>
                                    Once
                                </Chip>
                                <Chip active={recurrence === "weekly"} onClick={() => chooseRecurrence("weekly")}>
                                    Every week
                                </Chip>
                                <Chip active={recurrence === "monthly"} onClick={() => chooseRecurrence("monthly")}>
                                    Every month
                                </Chip>
                            </div>
                            {isRepeating && (
                                <p className="text-[12px] text-[#dfc0b6] opacity-70 mt-1">
                                    Each {recurrence === "weekly" ? "week" : "month"} starts on the start date&apos;s day and progress resets.
                                </p>
                            )}
                        </div>
                    </>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label>{isRepeating ? "First period starts" : "Start"}</Label>
                        <input type="date" className="auth-input w-full mt-1" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                        <Label>{isRepeating ? "Repeat until (optional)" : "Due date"}</Label>
                        <input
                            type="date"
                            className="auth-input w-full mt-1"
                            value={endDate ?? ""}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                {kind === "revise" && <RevisionPicker ownerId={ownerId} selected={selected} onChange={setSelected} />}

                {error && <p className="text-[13px]" style={{ color: "var(--dash-feedback-danger)" }}>{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2 px-4 border border-white/10 text-[#dfc0b6] font-semibold rounded-lg hover:bg-white/5 active:scale-95 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleSubmit()}
                        className="py-2 px-4 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
                    >
                        {saving ? "Saving…" : goal ? "Save" : "Create goal"}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}

/** Picks already-solved problems to revise; most recently solved first, with search. */
function RevisionPicker({
    ownerId,
    selected,
    onChange,
}: {
    ownerId: string;
    selected: Map<string, { title: string; platform: string }>;
    onChange: (next: Map<string, { title: string; platform: string }>) => void;
}) {
    const [search, setSearch] = useState("");
    const [platform, setPlatform] = useState("");
    const [candidates, setCandidates] = useState<RevisionCandidate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            setLoading(true);
            getRevisionCandidates(ownerId, { search, platform: platform || undefined })
                .then((rows) => {
                    if (!cancelled) setCandidates(rows);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [ownerId, search, platform]);

    function toggle(c: { problemId: string; title: string; platform: string }) {
        const next = new Map(selected);
        if (next.has(c.problemId)) next.delete(c.problemId);
        else next.set(c.problemId, { title: c.title, platform: c.platform });
        onChange(next);
    }

    return (
        <div>
            <Label>Problems to revise ({selected.size} selected)</Label>

            {selected.size > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {[...selected.entries()].map(([id, p]) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => toggle({ problemId: id, ...p })}
                            className="inline-flex items-center gap-1 rounded-md bg-[rgba(255,181,157,0.12)] px-2 py-0.5 text-[12px] text-[#ffb59d] hover:brightness-110"
                            title="Remove"
                        >
                            {p.title}
                            <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-2 mt-2">
                <input className="auth-input flex-1" placeholder="Search solved problems" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="auth-input" value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Platform">
                    <option value="">All</option>
                    {PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mt-2 max-h-[260px] overflow-y-auto space-y-1 pr-1">
                {loading && candidates.length === 0 ? (
                    <p className="text-[13px] text-[#dfc0b6] opacity-70 py-2">Loading your solved problems…</p>
                ) : candidates.length === 0 ? (
                    <p className="text-[13px] text-[#dfc0b6] opacity-70 py-2">No solved problems match.</p>
                ) : (
                    candidates.map((c) => {
                        const checked = selected.has(c.problemId);
                        return (
                            <label key={c.problemId} className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${checked ? "bg-[rgba(255,181,157,0.08)]" : "bg-white/5 hover:bg-white/10"}`}>
                                <input type="checkbox" className="accent-[#f47144]" checked={checked} onChange={() => toggle(c)} />
                                <span className="flex-1 min-w-0">
                                    <span className="block truncate text-[14px] text-[#e5e1e4]">{c.title}</span>
                                    <span className="block text-[11px] text-[#dfc0b6] opacity-70">
                                        {c.platform}
                                        {c.difficulty ? ` · ${c.difficulty}` : ""} · solved {c.lastSolvedDate}
                                    </span>
                                </span>
                            </label>
                        );
                    })
                )}
            </div>
        </div>
    );
}
