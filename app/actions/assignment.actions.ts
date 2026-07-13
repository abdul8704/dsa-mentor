"use server";

import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { requireUser, assertMentorOf, isActiveMentorship } from "@/app/lib/mentorship/access";
import { fetchProblemMeta, type ProblemEntry } from "@/app/lib/problemMeta/resolve";
import type { AssignmentView, TaskView, ActionResult, AssignmentInsights } from "@/app/lib/types/mentorship";

/**
 * Resolves problem metadata for a pasted URL (LeetCode, Codeforces or
 * AtCoder), then upserts it into the shared `problems` catalog table so
 * assignments can FK to it and analytics can join tags/difficulty.
 *
 * Uses the service-role client for the upsert (like the old worker did) since
 * the `problems` table is a shared catalog, not scoped to the current user.
 *
 * Shared by single-mentee and group assignment flows so the URL is only
 * resolved once even when fanning out to many mentees.
 */
export async function resolveProblemMeta(
    url: string
): Promise<{ ok: true; meta: ProblemEntry } | { ok: false; message: string }> {
    try {
        console.log(`[assignment] Resolving problem meta for url=${url}`);
        const problem = await fetchProblemMeta(url);

        // Upsert into the shared catalog (ignoreDuplicates keeps existing rows).
        const { error } = await getServiceRoleClient()
            .from("problems")
            .upsert([problem], { onConflict: "problem_id", ignoreDuplicates: true });

        if (error) {
            console.error(`[assignment] Failed to upsert problem ${problem.problem_id}: ${error.message}`);
            return { ok: false, message: "Could not save the problem. Please try again." };
        }

        console.log(`[assignment] Resolved ${problem.problem_id} (${problem.title})`);
        return { ok: true, meta: problem };
    } catch (err: unknown) {
        // fetchProblemMeta throws user-facing messages for bad/unresolvable URLs.
        const message = err instanceof Error ? err.message : "Could not resolve that problem. Check the URL and try again.";
        console.error(`[assignment] problem-meta failed for ${url}: ${message}`);
        return { ok: false, message };
    }
}

// ──────────────────────────────────────────────────────────────────────────
// assignProblem — mentor assigns a problem (by URL) to a mentee.
// Resolves + persists problem metadata, then inserts the assignment row.
// ──────────────────────────────────────────────────────────────────────────
export async function assignProblem(params: {
    menteeId: string;
    url: string;
    dueDate?: string | null;
    note?: string | null;
}): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        // Throws unless the current user actively mentors menteeId.
        const mentorId = await assertMentorOf(params.menteeId);

        const url = params.url.trim();
        if (!url) {
            return { success: false, message: "Paste a problem URL to assign." };
        }

        const resolved = await resolveProblemMeta(url);
        if (!resolved.ok) {
            return { success: false, message: resolved.message };
        }
        const meta = resolved.meta;

        // Insert the assignment. RLS requires mentor_id = auth.uid().
        const { error } = await supabase.from("assignments").insert({
            mentor_id: mentorId,
            mentee_id: params.menteeId,
            platform: meta.platform,
            problem_id: meta.problem_id,
            title: meta.title,
            url,
            note: params.note?.trim() || null,
            due_date: params.dueDate || null,
        });

        if (error) {
            console.error(`[assignment] Failed to insert assignment: ${error.message}`);
            return { success: false, message: "Could not save the assignment. Please try again." };
        }

        console.log(`[assignment] ${mentorId} assigned ${meta.problem_id} to ${params.menteeId}`);
        return { success: true, message: `Assigned "${meta.title}".` };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong assigning the problem.";
        console.error(`[assignment] assignProblem failed: ${message}`);
        return { success: false, message };
    }
}

// ──────────────────────────────────────────────────────────────────────────
// getAssignmentsForMentee — mentor views a mentee's assignments.
// ──────────────────────────────────────────────────────────────────────────
export async function getAssignmentsForMentee(menteeId: string): Promise<AssignmentView[]> {
    try {
        const supabase = await createSupabaseServerClient();
        await assertMentorOf(menteeId);

        const { data, error } = await supabase
            .from("assignments")
            .select("id, platform, problem_id, title, url, note, due_date, status, assigned_at, completed_at, completed_via")
            .eq("mentee_id", menteeId)
            .order("assigned_at", { ascending: false });

        if (error || !data) {
            if (error) console.error(`[assignment] getAssignmentsForMentee failed: ${error.message}`);
            return [];
        }

        return data.map(mapAssignmentRow);
    } catch (error) {
        console.error(`[assignment] getAssignmentsForMentee failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}

// ──────────────────────────────────────────────────────────────────────────
// getMyTasks — mentee views tasks assigned to them (with mentor + difficulty).
// ──────────────────────────────────────────────────────────────────────────
export async function getMyTasks(): Promise<TaskView[]> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const { data, error } = await supabase
            .from("assignments")
            .select("id, mentor_id, platform, problem_id, title, url, note, due_date, status, assigned_at, completed_at, completed_via")
            .eq("mentee_id", me.id)
            .order("status", { ascending: true }) // pending first
            .order("assigned_at", { ascending: false });

        if (error || !data?.length) {
            if (error) console.error(`[assignment] getMyTasks failed: ${error.message}`);
            return [];
        }

        // Enrich with mentor names and problem difficulty.
        const mentorIds = [...new Set(data.map((a) => a.mentor_id))];
        const problemIds = [...new Set(data.map((a) => a.problem_id))];

        const [{ data: mentors }, { data: problems }] = await Promise.all([
            supabase.from("profile").select("user_id, name").in("user_id", mentorIds),
            supabase.from("problems").select("problem_id, difficulty").in("problem_id", problemIds),
        ]);

        const mentorMap = new Map<string, string>();
        (mentors ?? []).forEach((m) => m.user_id && mentorMap.set(m.user_id, m.name ?? "Your mentor"));
        const difficultyMap = new Map<string, string | null>();
        (problems ?? []).forEach((p) => difficultyMap.set(p.problem_id, p.difficulty));

        return data.map((row) => ({
            ...mapAssignmentRow(row),
            mentorName: mentorMap.get(row.mentor_id) ?? "Your mentor",
            difficulty: difficultyMap.get(row.problem_id) ?? null,
        }));
    } catch (error) {
        console.error(`[assignment] getMyTasks failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}

// ──────────────────────────────────────────────────────────────────────────
// markAssignmentComplete — manual completion fallback (mentee or mentor).
// ──────────────────────────────────────────────────────────────────────────
export async function markAssignmentComplete(assignmentId: string): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        await requireUser(supabase);

        // RLS restricts this update to the assignment's mentor or mentee.
        const { data, error } = await supabase
            .from("assignments")
            .update({ status: "completed", completed_at: new Date().toISOString(), completed_via: "manual" })
            .eq("id", assignmentId)
            .eq("status", "pending")
            .select("id")
            .maybeSingle();

        if (error) {
            console.error(`[assignment] markAssignmentComplete failed: ${error.message}`);
            return { success: false, message: "Could not update the task." };
        }

        if (!data) {
            return { success: false, message: "Task already completed or not found." };
        }

        console.log(`[assignment] Assignment ${assignmentId} marked complete (manual)`);
        return { success: true, message: "Marked as complete." };
    } catch (error) {
        console.error(`[assignment] markAssignmentComplete failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong updating the task." };
    }
}

/** Maps a raw assignments row to the UI-facing AssignmentView. */
function mapAssignmentRow(row: {
    id: string;
    platform: string;
    problem_id: string;
    title: string;
    url: string | null;
    note: string | null;
    due_date: string | null;
    status: string;
    assigned_at: string;
    completed_at: string | null;
    completed_via: string | null;
}): AssignmentView {
    return {
        id: row.id,
        platform: row.platform,
        problemId: row.problem_id,
        title: row.title,
        url: row.url,
        note: row.note,
        dueDate: row.due_date,
        status: row.status as AssignmentView["status"],
        assignedAt: row.assigned_at,
        completedAt: row.completed_at,
        completedVia: (row.completed_via as AssignmentView["completedVia"]) ?? null,
    };
}

// ──────────────────────────────────────────────────────────────────────────
// getAssignmentInsights — mentor-only rollup of a mentee's assigned-task
// performance. Deliberately NOT reachable for a mentee viewing their own
// data (unlike assertMentorOf, this does not allow self-access).
// ──────────────────────────────────────────────────────────────────────────
export async function getAssignmentInsights(menteeId: string): Promise<AssignmentInsights | null> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        // A mentee must never see this rollup about themselves.
        if (me.id === menteeId) return null;

        const ok = await isActiveMentorship(supabase, me.id, menteeId);
        if (!ok) return null;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
        const sevenDaysAgoIso = sevenDaysAgo.toISOString().split("T")[0]!;

        const [
            { data: assignments, error: assignmentsError },
            { data: solved, error: solvedError },
            { count: solvedLast7Days, error: last7Error },
        ] = await Promise.all([
            supabase.from("assignments").select("problem_id, platform").eq("mentee_id", menteeId).eq("mentor_id", me.id),
            supabase.from("solved_problems").select("problem_id, platform").eq("user_id", menteeId),
            supabase
                .from("solved_problems")
                .select("problem_id", { count: "exact", head: true })
                .eq("user_id", menteeId)
                .gte("solved_date", sevenDaysAgoIso),
        ]);

        if (assignmentsError) console.error(`[assignment] getAssignmentInsights assignments query failed: ${assignmentsError.message}`);
        if (solvedError) console.error(`[assignment] getAssignmentInsights solved query failed: ${solvedError.message}`);
        if (last7Error) console.error(`[assignment] getAssignmentInsights last-7-days query failed: ${last7Error.message}`);

        // Average solved/day = problems solved in the last 7 days ÷ 7 (mentee's
        // overall solving pace, independent of how many tasks were assigned).
        const avgSolvedPerDay = Math.round(((solvedLast7Days ?? 0) / 7) * 100) / 100;

        const totalAssigned = assignments?.length ?? 0;
        if (totalAssigned === 0) {
            return { totalAssigned: 0, completedVerified: 0, unsolved: 0, avgSolvedPerDay };
        }

        // Verify completion against the mentee's actual solved-problems history —
        // NOT the assignment's `status` field, which can be marked done manually
        // without the problem actually having been solved.
        const solvedSet = new Set((solved ?? []).map((s) => `${s.platform}:${s.problem_id}`));
        const completedVerified = assignments!.filter((a) => solvedSet.has(`${a.platform}:${a.problem_id}`)).length;
        const unsolved = totalAssigned - completedVerified;

        return { totalAssigned, completedVerified, unsolved, avgSolvedPerDay };
    } catch (error) {
        console.error(`[assignment] getAssignmentInsights failed: ${error instanceof Error ? error.message : error}`);
        return null;
    }
}
