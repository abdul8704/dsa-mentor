"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { requireUser, assertMentorOf } from "@/app/lib/mentorship/access";
import { problemUrl } from "@/app/lib/public-api/serializers";
import {
    compareGoals,
    countSolves,
    currentPeriodIndex,
    daysBetween,
    goalStatus,
    periodAt,
    revisedOn,
    utcToday,
    type SolveRow,
    type Window,
} from "@/app/lib/goals/progress";
import type { ActionResult } from "@/app/lib/types/mentorship";
import type {
    GoalInput,
    GoalOwnerOption,
    GoalPeriodResult,
    GoalProblemView,
    GoalRecurrence,
    GoalView,
    RevisionCandidate,
} from "@/app/lib/types/goals";

const SUPPORTED_PLATFORMS = ["leetcode", "codeforces", "atcoder", "cses"];
const HISTORY_PERIODS = 6;
const MAX_REVISION_PROBLEMS = 200;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface GoalRow {
    id: string;
    user_id: string;
    created_by: string;
    name: string;
    kind: "solve" | "revise";
    start_date: string;
    end_date: string | null;
    recurrence: GoalRecurrence;
    target_count: number | null;
    platforms: string[] | null;
    include_already_solved: boolean;
    goal_problems: { problem_id: string; manually_revised_at: string | null }[];
}

const GOAL_COLUMNS =
    "id, user_id, created_by, name, kind, start_date, end_date, recurrence, target_count, platforms, include_already_solved, goal_problems(problem_id, manually_revised_at)";

// ─── Access ─────────────────────────────────────────────────────────────────

/**
 * Resolves whose goals are being worked on. `ownerId` defaults to the current
 * user; anyone else must be an active mentee of the current user. Goals
 * themselves are read/written with the session client (RLS allows owner or
 * active mentor); a mentee's solves are read with the service-role client,
 * only after that mentorship check, as the other mentor read paths do.
 */
async function resolveOwner(ownerId?: string | null) {
    const supabase = await createSupabaseServerClient();
    const me = await requireUser(supabase);
    const owner = ownerId || me.id;
    if (owner !== me.id) await assertMentorOf(owner);
    const solvesClient: SupabaseClient = owner === me.id ? supabase : getServiceRoleClient();
    return { supabase, me, owner, solvesClient };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** The current user plus every mentee they actively mentor. */
export async function getGoalOwners(): Promise<GoalOwnerOption[]> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const { data: links } = await supabase
            .from("mentorships")
            .select("mentee_id")
            .eq("mentor_id", me.id)
            .eq("status", "active");
        const menteeIds = (links ?? []).map((l) => l.mentee_id as string);

        const { data: profiles } = await supabase
            .from("profile")
            .select("user_id, name")
            .in("user_id", [me.id, ...menteeIds]);
        const nameOf = new Map((profiles ?? []).map((p) => [p.user_id as string, (p.name as string | null) ?? null]));

        return [
            { userId: me.id, name: "My goals", isMe: true },
            ...menteeIds
                .map((id) => ({ userId: id, name: nameOf.get(id) ?? "Mentee", isMe: false }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        ];
    } catch (error) {
        console.error(`[goals] getGoalOwners failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}

/** Paged: a goal window can hold more than PostgREST's 1000-row cap. */
async function fetchSolves(client: SupabaseClient, userId: string, from: string, to: string): Promise<SolveRow[]> {
    const PAGE_SIZE = 1000;
    const rows: SolveRow[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await client
            .from("solved_problems")
            .select("problem_id, platform, solved_date, already_solved")
            .eq("user_id", userId)
            .gte("solved_date", from)
            .lte("solved_date", to)
            .order("solved_date", { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw new Error(`solved_problems query failed: ${error.message}`);
        rows.push(...((data ?? []) as SolveRow[]));
        if (!data || data.length < PAGE_SIZE) break;
    }
    return rows;
}

async function fetchProblemTitles(
    client: SupabaseClient,
    problemIds: string[]
): Promise<Map<string, { title: string; platform: string }>> {
    const map = new Map<string, { title: string; platform: string }>();
    const ids = [...new Set(problemIds)];
    for (let i = 0; i < ids.length; i += 200) {
        const { data } = await client
            .from("problems")
            .select("problem_id, title, platform")
            .in("problem_id", ids.slice(i, i + 200));
        for (const p of data ?? []) map.set(p.problem_id as string, { title: p.title as string, platform: p.platform as string });
    }
    return map;
}

/** Every goal of `ownerId` (default: the current user) with live progress, in display order. */
export async function getGoals(ownerId?: string | null): Promise<GoalView[]> {
    try {
        const { supabase, me, owner, solvesClient } = await resolveOwner(ownerId);

        const { data, error } = await supabase.from("goals").select(GOAL_COLUMNS).eq("user_id", owner);
        if (error) throw new Error(error.message);
        const goals = (data ?? []) as GoalRow[];
        if (goals.length === 0) return [];

        const today = utcToday();

        // Every window we need: the current period, plus earlier ones for repeating goals.
        const plans = goals.map((g) => {
            const k = currentPeriodIndex(g, today);
            const history: Window[] = [];
            if (g.recurrence !== "none") {
                for (let j = k - 1; j >= Math.max(0, k - HISTORY_PERIODS); j--) history.push(periodAt(g, j));
            }
            return { goal: g, current: periodAt(g, k), history };
        });

        const allWindows = plans.flatMap((p) => [p.current, ...p.history]);
        const from = allWindows.reduce((min, w) => (w.start < min ? w.start : min), allWindows[0]!.start);
        const to = allWindows.reduce((max, w) => (w.end > max ? w.end : max), allWindows[0]!.end);
        const rows = from <= today ? await fetchSolves(solvesClient, owner, from, to < today ? to : today) : [];

        const creatorIds = [...new Set(goals.map((g) => g.created_by).filter((id) => id !== owner))];
        const { data: creators } = creatorIds.length
            ? await supabase.from("profile").select("user_id, name").in("user_id", creatorIds)
            : { data: [] };
        const creatorName = new Map((creators ?? []).map((c) => [c.user_id as string, c.name as string]));

        const views = plans.map(({ goal: g, current, history }) => {
            const base = {
                id: g.id,
                userId: g.user_id,
                name: g.name,
                kind: g.kind,
                recurrence: g.recurrence,
                startDate: g.start_date,
                endDate: g.end_date,
                periodStart: current.start,
                periodEnd: current.end,
                platforms: g.platforms,
                includeAlreadySolved: g.include_already_solved,
                daysLeft: daysBetween(today, current.end),
                createdByName: g.created_by === owner ? null : creatorName.get(g.created_by) ?? "Your mentor",
                createdByMe: g.created_by === me.id,
            };

            if (g.kind === "solve") {
                const target = g.target_count ?? 1;
                const counted = countSolves(rows, current, g.platforms, g.include_already_solved);
                const historyResults: GoalPeriodResult[] = history.map((w) => {
                    const progress = countSolves(rows, w, g.platforms, g.include_already_solved).size;
                    return { start: w.start, end: w.end, progress, met: progress >= target };
                });
                return {
                    ...base,
                    targetCount: target,
                    progress: counted.size,
                    status: goalStatus(current, counted.size, target, today),
                    problems: [...counted.entries()]
                        .sort(([, a], [, b]) => b.localeCompare(a))
                        .map(([problemId, solvedDate]) => ({ problemId, solvedDate }) as Pick<GoalProblemView, "problemId" | "solvedDate">),
                    history: historyResults,
                };
            }

            const items = g.goal_problems.map((gp) => {
                const autoDate = revisedOn(rows, gp.problem_id, current);
                const manual = gp.manually_revised_at !== null;
                return {
                    problemId: gp.problem_id,
                    solvedDate: autoDate ?? (manual ? gp.manually_revised_at!.slice(0, 10) : null),
                    revised: Boolean(autoDate) || manual,
                    revisedVia: autoDate ? ("auto" as const) : manual ? ("manual" as const) : null,
                };
            });
            const progress = items.filter((i) => i.revised).length;
            const target = Math.max(1, items.length);
            return {
                ...base,
                targetCount: items.length,
                progress,
                status: goalStatus(current, progress, target, today),
                // Not yet revised first, so what's left is at the top.
                problems: items.sort((a, b) => Number(a.revised) - Number(b.revised)),
                history: [],
            };
        });

        const titles = await fetchProblemTitles(
            supabase,
            views.flatMap((v) => v.problems.map((p) => p.problemId))
        );

        return views
            .map((v): GoalView => ({
                ...v,
                problems: v.problems.map((p) => ({
                    ...p,
                    title: titles.get(p.problemId)?.title ?? p.problemId,
                    platform: titles.get(p.problemId)?.platform ?? "",
                    url: problemUrl(p.problemId),
                })),
            }))
            .sort(compareGoals);
    } catch (error) {
        console.error(`[goals] getGoals failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}

/**
 * Already-solved problems for the revision-goal picker, most recently solved
 * first. `search` matches the title; `platform` narrows to one judge.
 */
export async function getRevisionCandidates(
    ownerId: string | null,
    params: { search?: string; platform?: string } = {}
): Promise<RevisionCandidate[]> {
    try {
        const { owner, solvesClient } = await resolveOwner(ownerId);

        let query = solvesClient
            .from("solved_problems")
            .select("problem_id, platform, solved_date, problems!inner(title, difficulty)")
            .eq("user_id", owner)
            .order("solved_date", { ascending: false })
            .limit(600);

        if (params.platform) query = query.eq("platform", params.platform);
        const search = params.search?.trim();
        if (search) query = query.ilike("problems.title", `%${search.replace(/[%_\\]/g, "\\$&")}%`);

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        const seen = new Map<string, RevisionCandidate>();
        for (const row of data ?? []) {
            const id = row.problem_id as string;
            if (seen.has(id)) continue;
            const problem = (Array.isArray(row.problems) ? row.problems[0] : row.problems) as
                | { title: string; difficulty: string | null }
                | undefined;
            seen.set(id, {
                problemId: id,
                title: problem?.title ?? id,
                platform: row.platform as string,
                difficulty: problem?.difficulty ?? null,
                lastSolvedDate: row.solved_date as string,
            });
            if (seen.size >= 100) break;
        }
        return [...seen.values()];
    } catch (error) {
        console.error(`[goals] getRevisionCandidates failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}

// ─── Writes ─────────────────────────────────────────────────────────────────

type Validated = Omit<GoalInput, "problemIds"> & { problemIds: string[] };

function validate(input: GoalInput): { ok: true; value: Validated } | { ok: false; message: string } {
    const name = input.name.trim();
    if (!name) return { ok: false, message: "Give the goal a name." };
    if (name.length > 120) return { ok: false, message: "Keep the name under 120 characters." };
    if (input.kind !== "solve" && input.kind !== "revise") return { ok: false, message: "Unknown goal type." };
    if (!ISO_DATE.test(input.startDate)) return { ok: false, message: "Pick a start date." };
    if (input.endDate && !ISO_DATE.test(input.endDate)) return { ok: false, message: "That end date isn't valid." };

    const recurrence: GoalRecurrence = input.kind === "revise" ? "none" : input.recurrence;
    if (!["none", "weekly", "monthly"].includes(recurrence)) return { ok: false, message: "Unknown repeat option." };
    if (recurrence === "none" && !input.endDate) return { ok: false, message: "Pick a due date." };
    if (input.endDate && input.endDate < input.startDate) return { ok: false, message: "The end date is before the start date." };

    let targetCount: number | null = null;
    let platforms: string[] | null = null;
    let problemIds: string[] = [];

    if (input.kind === "solve") {
        targetCount = Math.floor(Number(input.targetCount));
        if (!Number.isFinite(targetCount) || targetCount < 1 || targetCount > 10000) {
            return { ok: false, message: "Set a target between 1 and 10000 problems." };
        }
        const chosen = (input.platforms ?? []).filter((p) => SUPPORTED_PLATFORMS.includes(p));
        platforms = chosen.length === 0 || chosen.length === SUPPORTED_PLATFORMS.length ? null : [...new Set(chosen)];
    } else {
        problemIds = [...new Set(input.problemIds)];
        if (problemIds.length === 0) return { ok: false, message: "Pick at least one problem to revise." };
        if (problemIds.length > MAX_REVISION_PROBLEMS) {
            return { ok: false, message: `A revision goal can hold up to ${MAX_REVISION_PROBLEMS} problems.` };
        }
    }

    return {
        ok: true,
        value: {
            name,
            kind: input.kind,
            startDate: input.startDate,
            endDate: input.endDate || null,
            recurrence,
            targetCount,
            platforms,
            includeAlreadySolved: input.kind === "solve" && Boolean(input.includeAlreadySolved),
            problemIds,
        },
    };
}

/** Revision problems must be ones the owner has actually solved. */
async function allSolvedBy(client: SupabaseClient, owner: string, problemIds: string[]): Promise<boolean> {
    const found = new Set<string>();
    for (let i = 0; i < problemIds.length; i += 200) {
        const { data } = await client
            .from("solved_problems")
            .select("problem_id")
            .eq("user_id", owner)
            .in("problem_id", problemIds.slice(i, i + 200));
        for (const r of data ?? []) found.add(r.problem_id as string);
    }
    return problemIds.every((id) => found.has(id));
}

const toColumns = (v: Validated) => ({
    name: v.name,
    start_date: v.startDate,
    end_date: v.endDate,
    recurrence: v.recurrence,
    target_count: v.targetCount,
    platforms: v.platforms,
    include_already_solved: v.includeAlreadySolved,
    updated_at: new Date().toISOString(),
});

export async function createGoal(ownerId: string | null, input: GoalInput): Promise<ActionResult> {
    try {
        const { supabase, me, owner, solvesClient } = await resolveOwner(ownerId);
        const checked = validate(input);
        if (!checked.ok) return { success: false, message: checked.message };
        const v = checked.value;

        if (v.kind === "revise" && !(await allSolvedBy(solvesClient, owner, v.problemIds))) {
            return { success: false, message: "Only problems that have already been solved can be revised." };
        }

        const { data, error } = await supabase
            .from("goals")
            .insert({ ...toColumns(v), user_id: owner, created_by: me.id, kind: v.kind })
            .select("id")
            .single();
        if (error || !data) throw new Error(error?.message ?? "insert returned nothing");

        if (v.kind === "revise") {
            const { error: gpError } = await supabase
                .from("goal_problems")
                .insert(v.problemIds.map((problem_id) => ({ goal_id: data.id, problem_id })));
            if (gpError) {
                await supabase.from("goals").delete().eq("id", data.id);
                throw new Error(gpError.message);
            }
        }

        return { success: true, message: `Created "${v.name}".` };
    } catch (error) {
        console.error(`[goals] createGoal failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Could not save the goal. Please try again." };
    }
}

/** Updates a goal. Its type (solve/revise) is fixed once created. */
export async function updateGoal(goalId: string, input: GoalInput): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: existing } = await supabase.from("goals").select("user_id, kind").eq("id", goalId).maybeSingle();
        if (!existing) return { success: false, message: "That goal no longer exists." };

        const { solvesClient, owner } = await resolveOwner(existing.user_id as string);
        const checked = validate({ ...input, kind: existing.kind as GoalInput["kind"] });
        if (!checked.ok) return { success: false, message: checked.message };
        const v = checked.value;

        if (v.kind === "revise" && !(await allSolvedBy(solvesClient, owner, v.problemIds))) {
            return { success: false, message: "Only problems that have already been solved can be revised." };
        }

        const { error } = await supabase.from("goals").update(toColumns(v)).eq("id", goalId);
        if (error) throw new Error(error.message);

        if (v.kind === "revise") {
            // Keep rows that stay (and their manual "revised" marks); swap the rest.
            const { data: current } = await supabase.from("goal_problems").select("problem_id").eq("goal_id", goalId);
            const have = new Set((current ?? []).map((r) => r.problem_id as string));
            const want = new Set(v.problemIds);
            const removed = [...have].filter((id) => !want.has(id));
            const added = [...want].filter((id) => !have.has(id));
            if (removed.length) {
                const { error: delError } = await supabase
                    .from("goal_problems")
                    .delete()
                    .eq("goal_id", goalId)
                    .in("problem_id", removed);
                if (delError) throw new Error(delError.message);
            }
            if (added.length) {
                const { error: addError } = await supabase
                    .from("goal_problems")
                    .insert(added.map((problem_id) => ({ goal_id: goalId, problem_id })));
                if (addError) throw new Error(addError.message);
            }
        }

        return { success: true, message: `Saved "${v.name}".` };
    } catch (error) {
        console.error(`[goals] updateGoal failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Could not save the goal. Please try again." };
    }
}

export async function deleteGoal(goalId: string): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        await requireUser(supabase);
        const { data, error } = await supabase.from("goals").delete().eq("id", goalId).select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) return { success: false, message: "That goal no longer exists." };
        return { success: true, message: "Goal deleted." };
    } catch (error) {
        console.error(`[goals] deleteGoal failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Could not delete the goal. Please try again." };
    }
}

/** Manual "revised" mark for a problem revised without resubmitting it. */
export async function setProblemRevised(goalId: string, problemId: string, revised: boolean): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        await requireUser(supabase);
        const { data, error } = await supabase
            .from("goal_problems")
            .update({ manually_revised_at: revised ? new Date().toISOString() : null })
            .eq("goal_id", goalId)
            .eq("problem_id", problemId)
            .select("goal_id");
        if (error) throw new Error(error.message);
        if (!data?.length) return { success: false, message: "That problem is no longer part of this goal." };
        return { success: true, message: revised ? "Marked as revised." : "Unmarked." };
    } catch (error) {
        console.error(`[goals] setProblemRevised failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Could not update the problem. Please try again." };
    }
}
