"use server";

import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

const PLATFORM_TABLE = "user_platforms";

type PlatformKey = "leetcode" | "codeforces" | "atcoder";

type ProfileDetails = {
    name: string;
    description: string;
};

export async function getAllPlatformHandles(user_id: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from(PLATFORM_TABLE).select("*").eq("user_id", user_id);
    
    if(error)
        throw new Error(error.message);

    return { data, error };
}


const normalizeHandle = (handle: string) => handle.trim();

/**
 * Upsert platform handles for a user and report which platforms were newly
 * added or had their handle changed. The caller uses `affectedPlatforms` to
 * trigger a purge + re-import so stale data from an old handle never lingers.
 */
export async function addPlatformHandles(
    user_id: string,
    data: { platform: PlatformKey; handle: string }[]
): Promise<{ error: null; affectedPlatforms: PlatformKey[] }> {
    const supabase = await createSupabaseServerClient();

    const rows = data
        .map((d) => ({
            user_id,
            platform: d.platform,
            handle: normalizeHandle(d.handle),
        }))
        .filter((row) => row.handle.length > 0);

    if (rows.length === 0) {
        return { error: null, affectedPlatforms: [] };
    }

    const { data: existing, error: fetchError } = await supabase
        .from(PLATFORM_TABLE)
        .select("platform, handle")
        .eq("user_id", user_id);

    if (fetchError) {
        throw new Error(fetchError.message);
    }

    const existingHandles = new Map<string, string>();
    existing?.forEach((row) => {
        existingHandles.set(row.platform, normalizeHandle(row.handle ?? ""));
    });

    const affectedPlatforms = rows
        .filter((row) => {
            const prev = existingHandles.get(row.platform);
            // New platform (no prior handle) or the handle actually changed.
            return prev === undefined || prev !== row.handle;
        })
        .map((row) => row.platform as PlatformKey);

    const { error } = await supabase
        .from(PLATFORM_TABLE)
        .upsert(rows, { onConflict: "user_id,platform" });
    if (error)
        throw new Error(error.message);

    console.log(
        `Platform handles upserted for user ${user_id}; affected: ${affectedPlatforms.join(", ") || "none"}`
    );
    return { error: null, affectedPlatforms };
}

/**
 * CSES-only: saves just the mentee's CSES username, with no verification and
 * no worker sync — CSES has no public way to check a bare username, so this
 * is display-only until the mentee separately provides a session cookie or
 * password on the settings page (see ConnectCsesForm.tsx, which posts
 * directly to the worker's own POST /cses/connect and does the real
 * verification + import). Deliberately NOT folded into addPlatformHandles/PlatformKey above
 * — that function's `affectedPlatforms` return value drives an immediate
 * worker resync, which would be wrong here since there's no session yet to
 * sync anything with.
 */
export async function saveCsesUsername(user_id: string, username: string): Promise<{ error: null }> {
    const supabase = await createSupabaseServerClient();
    const handle = normalizeHandle(username);

    if (!handle) {
        return { error: null };
    }

    const { error } = await supabase
        .from(PLATFORM_TABLE)
        .upsert({ user_id, platform: "cses", handle }, { onConflict: "user_id,platform" });

    if (error) {
        throw new Error(error.message);
    }

    return { error: null };
}

export async function completeOnboarding(user_id: string, profile: ProfileDetails) {
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
        .from("profile")
        .select("user_id")
        .eq("user_id", user_id)
        .maybeSingle();

    const profilePayload = {
        name: profile.name.trim(),
        description: profile.description.trim() || null,
        onboarding_completed: true,
    };

    if (existing) {
        const { error } = await supabase
            .from("profile")
            .update(profilePayload)
            .eq("user_id", user_id);

        if (error) {
            throw new Error(error.message);
        }

        return;
    }

    const { error } = await supabase.from("profile").insert({
        user_id,
        ...profilePayload,
    });

    if (error) {
        throw new Error(error.message);
    }
}
