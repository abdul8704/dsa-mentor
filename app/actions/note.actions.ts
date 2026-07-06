"use server";

import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { requireUser, assertMentorOf } from "@/app/lib/mentorship/access";
import type { ActionResult, SentNote, MenteeNote } from "@/app/lib/types/mentorship";

/**
 * Mentor → mentee notes. A note is always stored per-mentee (never per-group),
 * so a mentee reading their notes has no way to tell whether it was sent to
 * them individually or fanned out to an entire group.
 */

// ──────────────────────────────────────────────────────────────────────────
// sendNoteToMentee — mentor sends a note to a single mentee.
// ──────────────────────────────────────────────────────────────────────────
export async function sendNoteToMentee(menteeId: string, body: string): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const mentorId = await assertMentorOf(menteeId);

        const trimmed = body.trim();
        if (!trimmed) {
            return { success: false, message: "Write a note before sending." };
        }

        const { error } = await supabase.from("mentor_notes").insert({ mentor_id: mentorId, mentee_id: menteeId, body: trimmed });

        if (error) {
            console.error(`[notes] sendNoteToMentee failed: ${error.message}`);
            return { success: false, message: "Could not send the note. Please try again." };
        }

        return { success: true, message: "Note sent." };
    } catch (error) {
        console.error(`[notes] sendNoteToMentee failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong sending the note." };
    }
}

// ──────────────────────────────────────────────────────────────────────────
// sendNoteToGroup — fans a note out to a group's members. Pass `menteeIds`
// to restrict delivery to a subset of the group's current members; omit it
// (or leave empty) to send to everyone currently in the group.
// ──────────────────────────────────────────────────────────────────────────
export async function sendNoteToGroup(groupId: string, body: string, menteeIds?: string[]): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const trimmed = body.trim();
        if (!trimmed) {
            return { success: false, message: "Write a note before sending." };
        }

        const { data: group } = await supabase
            .from("mentee_groups")
            .select("id")
            .eq("id", groupId)
            .eq("mentor_id", me.id)
            .maybeSingle();

        if (!group) return { success: false, message: "Group not found." };

        const { data: members } = await supabase.from("mentee_group_members").select("mentee_id").eq("group_id", groupId);
        const currentMemberIds = new Set((members ?? []).map((m) => m.mentee_id));

        // Only ever send to mentees who are still actually in the group.
        const targetIds = menteeIds && menteeIds.length > 0 ? menteeIds.filter((id) => currentMemberIds.has(id)) : [...currentMemberIds];

        if (targetIds.length === 0) {
            return { success: false, message: "Select at least one mentee in this group." };
        }

        const { error } = await supabase
            .from("mentor_notes")
            .insert(targetIds.map((menteeId) => ({ mentor_id: me.id, mentee_id: menteeId, body: trimmed })));

        if (error) {
            console.error(`[notes] sendNoteToGroup failed: ${error.message}`);
            return { success: false, message: "Could not send the note. Please try again." };
        }

        return { success: true, message: `Note sent to ${targetIds.length} mentee${targetIds.length === 1 ? "" : "s"}.` };
    } catch (error) {
        console.error(`[notes] sendNoteToGroup failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong sending the note." };
    }
}

// ──────────────────────────────────────────────────────────────────────────
// getNotesForMentee — mentor views notes they've sent to a specific mentee.
// ──────────────────────────────────────────────────────────────────────────
export async function getNotesForMentee(menteeId: string): Promise<SentNote[]> {
    try {
        const supabase = await createSupabaseServerClient();
        const mentorId = await assertMentorOf(menteeId);

        const { data, error } = await supabase
            .from("mentor_notes")
            .select("id, body, created_at")
            .eq("mentor_id", mentorId)
            .eq("mentee_id", menteeId)
            .order("created_at", { ascending: false });

        if (error || !data) return [];

        const { data: profile } = await supabase.from("profile").select("name").eq("user_id", menteeId).maybeSingle();
        const menteeName = profile?.name?.trim() || "Mentee";

        return data.map((n) => ({ id: n.id, menteeId, menteeName, body: n.body, createdAt: n.created_at }));
    } catch (error) {
        console.error(`[notes] getNotesForMentee failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}

// ──────────────────────────────────────────────────────────────────────────
// getMyNotes — mentee views notes sent to them by their mentor(s).
// ──────────────────────────────────────────────────────────────────────────
export async function getMyNotes(): Promise<MenteeNote[]> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const { data, error } = await supabase
            .from("mentor_notes")
            .select("id, mentor_id, body, created_at")
            .eq("mentee_id", me.id)
            .order("created_at", { ascending: false });

        if (error || !data?.length) return [];

        const mentorIds = [...new Set(data.map((n) => n.mentor_id))];
        const { data: profiles } = await supabase.from("profile").select("user_id, name").in("user_id", mentorIds);
        const nameMap = new Map<string, string>();
        (profiles ?? []).forEach((p) => p.user_id && nameMap.set(p.user_id, p.name ?? "Your mentor"));

        return data.map((n) => ({
            id: n.id,
            mentorName: nameMap.get(n.mentor_id) ?? "Your mentor",
            body: n.body,
            createdAt: n.created_at,
        }));
    } catch (error) {
        console.error(`[notes] getMyNotes failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}
