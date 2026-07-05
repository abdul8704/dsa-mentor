"use server";

import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { requireUser } from "@/app/lib/mentorship/access";
import { resolveProblemMeta } from "@/app/actions/assignment.actions";
import type { ActionResult, MenteeGroup, MenteeGroupDetail } from "@/app/lib/types/mentorship";

/**
 * Mentee groups let a mentor batch-assign tasks and notes to several mentees
 * at once. Groups are a mentor-only concept — RLS on `mentee_groups` and
 * `mentee_group_members` never grants mentee access, so a mentee can never
 * discover which (if any) group they belong to.
 */

// ──────────────────────────────────────────────────────────────────────────
// getMyGroups — groups owned by the current mentor, with member counts.
// ──────────────────────────────────────────────────────────────────────────
export async function getMyGroups(): Promise<MenteeGroup[]> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const { data: groups, error } = await supabase
            .from("mentee_groups")
            .select("id, name, created_at")
            .eq("mentor_id", me.id)
            .order("created_at", { ascending: true });

        if (error || !groups) {
            if (error) console.error(`[groups] getMyGroups failed: ${error.message}`);
            return [];
        }

        if (groups.length === 0) return [];

        const { data: members } = await supabase
            .from("mentee_group_members")
            .select("group_id")
            .in(
                "group_id",
                groups.map((g) => g.id)
            );

        const counts = new Map<string, number>();
        (members ?? []).forEach((m) => counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1));

        return groups.map((g) => ({
            id: g.id,
            name: g.name,
            memberCount: counts.get(g.id) ?? 0,
            createdAt: g.created_at,
        }));
    } catch (error) {
        console.error(`[groups] getMyGroups failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}

// ──────────────────────────────────────────────────────────────────────────
// getGroupDetail — a single group's membership, for the manage/edit UI.
// ──────────────────────────────────────────────────────────────────────────
export async function getGroupDetail(groupId: string): Promise<MenteeGroupDetail | null> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const { data: group, error } = await supabase
            .from("mentee_groups")
            .select("id, name")
            .eq("id", groupId)
            .eq("mentor_id", me.id)
            .maybeSingle();

        if (error || !group) return null;

        const { data: members } = await supabase
            .from("mentee_group_members")
            .select("mentee_id")
            .eq("group_id", groupId);

        return {
            id: group.id,
            name: group.name,
            memberIds: (members ?? []).map((m) => m.mentee_id),
        };
    } catch (error) {
        console.error(`[groups] getGroupDetail failed: ${error instanceof Error ? error.message : error}`);
        return null;
    }
}

// ──────────────────────────────────────────────────────────────────────────
// createGroup — creates a group and seeds its membership in one call.
// ──────────────────────────────────────────────────────────────────────────
export async function createGroup(params: { name: string; menteeIds: string[] }): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const name = params.name.trim();
        if (!name) {
            return { success: false, message: "Give the group a name." };
        }

        // Only allow adding mentees the mentor actually mentors.
        const validMenteeIds = await filterActiveMentees(supabase, me.id, params.menteeIds);

        const { data: group, error } = await supabase
            .from("mentee_groups")
            .insert({ mentor_id: me.id, name })
            .select("id")
            .single();

        if (error || !group) {
            const message = error?.code === "23505" ? "You already have a group with that name." : "Could not create the group. Please try again.";
            console.error(`[groups] createGroup insert failed: ${error?.message}`);
            return { success: false, message };
        }

        if (validMenteeIds.length > 0) {
            const { error: memberError } = await supabase
                .from("mentee_group_members")
                .insert(validMenteeIds.map((menteeId) => ({ group_id: group.id, mentee_id: menteeId })));

            if (memberError) {
                console.error(`[groups] Failed to add members to new group: ${memberError.message}`);
            }
        }

        console.log(`[groups] ${me.id} created group "${name}" with ${validMenteeIds.length} members`);
        return { success: true, message: `Group "${name}" created.` };
    } catch (error) {
        console.error(`[groups] createGroup failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong creating the group." };
    }
}

// ──────────────────────────────────────────────────────────────────────────
// addMenteesToGroup — adds mentees to a group without touching existing members.
// ──────────────────────────────────────────────────────────────────────────
export async function addMenteesToGroup(params: { groupId: string; menteeIds: string[] }): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const { data: group } = await supabase
            .from("mentee_groups")
            .select("id")
            .eq("id", params.groupId)
            .eq("mentor_id", me.id)
            .maybeSingle();

        if (!group) {
            return { success: false, message: "Group not found." };
        }

        const validMenteeIds = await filterActiveMentees(supabase, me.id, params.menteeIds);
        if (validMenteeIds.length === 0) {
            return { success: false, message: "Select at least one mentee to add." };
        }

        const { error } = await supabase
            .from("mentee_group_members")
            .upsert(
                validMenteeIds.map((menteeId) => ({ group_id: params.groupId, mentee_id: menteeId })),
                { onConflict: "group_id,mentee_id", ignoreDuplicates: true }
            );

        if (error) {
            console.error(`[groups] addMenteesToGroup failed: ${error.message}`);
            return { success: false, message: "Could not add mentees to the group." };
        }

        return { success: true, message: `Added ${validMenteeIds.length} mentee${validMenteeIds.length === 1 ? "" : "s"}.` };
    } catch (error) {
        console.error(`[groups] addMenteesToGroup failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong updating the group." };
    }
}

// ──────────────────────────────────────────────────────────────────────────
// removeMenteeFromGroup — removes a single mentee from a group.
// ──────────────────────────────────────────────────────────────────────────
export async function removeMenteeFromGroup(groupId: string, menteeId: string): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const { data: group } = await supabase
            .from("mentee_groups")
            .select("id")
            .eq("id", groupId)
            .eq("mentor_id", me.id)
            .maybeSingle();

        if (!group) {
            return { success: false, message: "Group not found." };
        }

        const { error } = await supabase
            .from("mentee_group_members")
            .delete()
            .eq("group_id", groupId)
            .eq("mentee_id", menteeId);

        if (error) {
            console.error(`[groups] removeMenteeFromGroup failed: ${error.message}`);
            return { success: false, message: "Could not remove that mentee from the group." };
        }

        return { success: true, message: "Mentee removed from the group." };
    } catch (error) {
        console.error(`[groups] removeMenteeFromGroup failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong updating the group." };
    }
}

// ──────────────────────────────────────────────────────────────────────────
// renameGroup
// ──────────────────────────────────────────────────────────────────────────
export async function renameGroup(groupId: string, name: string): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const trimmed = name.trim();
        if (!trimmed) return { success: false, message: "Give the group a name." };

        const { data, error } = await supabase
            .from("mentee_groups")
            .update({ name: trimmed })
            .eq("id", groupId)
            .eq("mentor_id", me.id)
            .select("id")
            .maybeSingle();

        if (error) {
            const message = error.code === "23505" ? "You already have a group with that name." : "Could not rename the group.";
            return { success: false, message };
        }
        if (!data) return { success: false, message: "Group not found." };

        return { success: true, message: "Group renamed." };
    } catch (error) {
        console.error(`[groups] renameGroup failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong renaming the group." };
    }
}

// ──────────────────────────────────────────────────────────────────────────
// deleteGroup
// ──────────────────────────────────────────────────────────────────────────
export async function deleteGroup(groupId: string): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const { error } = await supabase.from("mentee_groups").delete().eq("id", groupId).eq("mentor_id", me.id);

        if (error) {
            console.error(`[groups] deleteGroup failed: ${error.message}`);
            return { success: false, message: "Could not delete the group." };
        }

        return { success: true, message: "Group deleted." };
    } catch (error) {
        console.error(`[groups] deleteGroup failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong deleting the group." };
    }
}

// ──────────────────────────────────────────────────────────────────────────
// assignProblemToGroup — resolves the problem once, then assigns it to the
// given members of the group (or every current member if none are specified).
// ──────────────────────────────────────────────────────────────────────────
export async function assignProblemToGroup(params: {
    groupId: string;
    url: string;
    dueDate?: string | null;
    note?: string | null;
    /** Restrict the assignment to a subset of the group's current members. Defaults to all members. */
    menteeIds?: string[];
}): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const url = params.url.trim();
        if (!url) return { success: false, message: "Paste a problem URL to assign." };

        const { data: group } = await supabase
            .from("mentee_groups")
            .select("id, name")
            .eq("id", params.groupId)
            .eq("mentor_id", me.id)
            .maybeSingle();

        if (!group) return { success: false, message: "Group not found." };

        const { data: members } = await supabase.from("mentee_group_members").select("mentee_id").eq("group_id", params.groupId);
        const currentMemberIds = new Set((members ?? []).map((m) => m.mentee_id));

        // Only ever assign to mentees who are still actually in the group.
        const menteeIds = params.menteeIds ? params.menteeIds.filter((id) => currentMemberIds.has(id)) : [...currentMemberIds];

        if (menteeIds.length === 0) {
            return { success: false, message: "Select at least one mentee in this group." };
        }

        const resolved = await resolveProblemMeta(url);
        if (!resolved.ok) return { success: false, message: resolved.message };
        const meta = resolved.meta;

        const rows = menteeIds.map((menteeId) => ({
            mentor_id: me.id,
            mentee_id: menteeId,
            platform: meta.platform,
            problem_id: meta.problem_id,
            title: meta.title,
            url,
            note: params.note?.trim() || null,
            due_date: params.dueDate || null,
        }));

        const { error } = await supabase.from("assignments").insert(rows);
        if (error) {
            console.error(`[groups] assignProblemToGroup insert failed: ${error.message}`);
            return { success: false, message: "Could not assign the problem to the group." };
        }

        console.log(`[groups] ${me.id} assigned ${meta.problem_id} to group ${group.name} (${menteeIds.length} mentees)`);
        return { success: true, message: `Assigned "${meta.title}" to ${menteeIds.length} mentee${menteeIds.length === 1 ? "" : "s"}.` };
    } catch (error) {
        console.error(`[groups] assignProblemToGroup failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong assigning the problem." };
    }
}

/** Keeps only mentee ids the mentor actively mentors, to prevent adding arbitrary users. */
async function filterActiveMentees(
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
    mentorId: string,
    candidateIds: string[]
): Promise<string[]> {
    const unique = [...new Set(candidateIds)];
    if (unique.length === 0) return [];

    const { data } = await supabase
        .from("mentorships")
        .select("mentee_id")
        .eq("mentor_id", mentorId)
        .eq("status", "active")
        .in("mentee_id", unique);

    return (data ?? []).map((m) => m.mentee_id);
}
