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


export async function addPlatformHandles(user_id: string, data: { platform: PlatformKey; handle: string }[]) {
    const supabase = await createSupabaseServerClient();

    const rows = data
        .map((d) => ({
            user_id,
            platform: d.platform,
            handle: d.handle,
        }))
        .filter((row) => row.handle.length > 0);

    if (rows.length === 0) {
        return { error: null };
    }

    const { error } = await supabase.from(PLATFORM_TABLE).upsert(rows);
    if(error)
        throw new Error(error.message);

    console.log("Platform handles upserted successfully for user:", user_id);
    return { error };
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
