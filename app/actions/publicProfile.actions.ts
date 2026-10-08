"use server";

import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { requireUser } from "@/app/lib/mentorship/access";
import { purgePublicCache } from "@/app/lib/public-api/profile";
import {
    PUBLIC_WIDGETS,
    isPublicWidget,
    normalizeHandle,
    validateHandle,
    type PublicWidget,
} from "@/app/lib/public-api/widgets";

/**
 * Settings for the opt-in public API. Both actions act only on the signed-in
 * user's own row (the user id comes from the session, never from the
 * caller), and RLS on `public_profiles` enforces the same.
 */

export interface PublicProfileSettings {
    enabled: boolean;
    handle: string;
    widgets: PublicWidget[];
}

export type SavePublicProfileResult =
    | { ok: true; settings: PublicProfileSettings }
    | { ok: false; error: string };

export async function getMyPublicProfile(): Promise<PublicProfileSettings | null> {
    const supabase = await createSupabaseServerClient();
    const me = await requireUser(supabase);

    const { data, error } = await supabase
        .from("public_profiles")
        .select("handle, enabled, widgets")
        .eq("user_id", me.id)
        .maybeSingle();

    if (error) {
        console.error(`[publicProfile] Failed to load settings for ${me.id}: ${error.message}`);
        return null;
    }
    if (!data) return null;

    return {
        enabled: data.enabled,
        handle: data.handle,
        widgets: ((data.widgets ?? []) as string[]).filter(isPublicWidget),
    };
}

export async function savePublicProfile(input: PublicProfileSettings): Promise<SavePublicProfileResult> {
    let supabase;
    let me;
    try {
        supabase = await createSupabaseServerClient();
        me = await requireUser(supabase);
    } catch {
        return { ok: false, error: "Please sign in again." };
    }

    const handle = normalizeHandle(String(input?.handle ?? ""));
    const handleError = validateHandle(handle);
    if (handleError) return { ok: false, error: handleError };

    const enabled = input?.enabled === true;
    const requested = Array.isArray(input?.widgets) ? input.widgets.map(String) : [];
    // Keep the canonical order and drop anything unknown.
    const widgets = PUBLIC_WIDGETS.filter((w) => requested.includes(w));

    const { data: previous } = await supabase
        .from("public_profiles")
        .select("handle")
        .eq("user_id", me.id)
        .maybeSingle();

    const { error } = await supabase
        .from("public_profiles")
        .upsert(
            { user_id: me.id, handle, enabled, widgets, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
        );

    if (error) {
        if (error.code === "23505") return { ok: false, error: "That handle is already taken." };
        console.error(`[publicProfile] Failed to save settings for ${me.id}: ${error.message}`);
        return { ok: false, error: "Couldn't save your public profile settings. Please try again." };
    }

    // Make the change visible on our side right away (old handle included,
    // so a renamed handle stops resolving immediately).
    await purgePublicCache(me.id, [handle, ...(previous?.handle && previous.handle !== handle ? [previous.handle] : [])]);

    return { ok: true, settings: { enabled, handle, widgets } };
}
