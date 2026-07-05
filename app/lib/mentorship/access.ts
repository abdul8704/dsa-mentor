import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../supabase/server-client";

/**
 * Mentorship authorization helpers.
 *
 * These centralize the "is the current user allowed to act on this
 * relationship?" checks so every mentor/mentee action enforces them
 * consistently. All reads of another user's data MUST go through a verified
 * path here first.
 */

export interface CurrentUser {
    id: string;
    email: string | null;
}

/**
 * Returns the authenticated user, or throws if there is no session.
 * Throwing (rather than returning null) keeps callers terse and fails closed.
 */
export async function requireUser(supabase?: SupabaseClient): Promise<CurrentUser> {
    const client = supabase ?? (await createSupabaseServerClient());
    const {
        data: { user },
        error,
    } = await client.auth.getUser();

    if (error || !user) {
        throw new Error("Not authenticated");
    }

    return { id: user.id, email: user.email ?? null };
}

/**
 * Verifies that `mentorId` actively mentors `menteeId`. Returns true/false
 * rather than throwing so callers can choose the response (404 vs redirect).
 */
export async function isActiveMentorship(
    supabase: SupabaseClient,
    mentorId: string,
    menteeId: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from("mentorships")
        .select("id")
        .eq("mentor_id", mentorId)
        .eq("mentee_id", menteeId)
        .eq("status", "active")
        .maybeSingle();

    if (error) {
        console.error(`[access] Failed to verify mentorship ${mentorId}->${menteeId}: ${error.message}`);
        return false;
    }

    return Boolean(data);
}

/**
 * Guard used by mentor read paths: throws unless the current user actively
 * mentors the target mentee. Returns the verified mentor id on success.
 */
export async function assertMentorOf(menteeId: string): Promise<string> {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(supabase);

    if (user.id === menteeId) {
        // A user is trivially allowed to view their own data elsewhere; this
        // guard is specifically for cross-user mentor access.
        return user.id;
    }

    const ok = await isActiveMentorship(supabase, user.id, menteeId);
    if (!ok) {
        throw new Error("You are not an active mentor for this user");
    }

    return user.id;
}
