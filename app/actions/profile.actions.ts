"use server";

import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

const PLATFORM_TABLE = "user_platforms";

type PlatformKey =
    | "leetcode"
    | "codeforces"
    | "codechef"
    | "atcoder"
    | "hackerrank"
    | "github";

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
