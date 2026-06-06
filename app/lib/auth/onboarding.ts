import { createSupabaseServerClient } from "../supabase/server-client";

export async function isOnboardingCompleted(userId: string): Promise<boolean> {
    const supabase = await createSupabaseServerClient();

    const { data } = await supabase
        .from("profile")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle();

    return data?.onboarding_completed ?? false;
}

export async function ensureProfile(userId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { data } = await supabase
        .from("profile")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (!data) {
        await supabase.from("profile").insert({
            user_id: userId,
            onboarding_completed: false,
        });
    }
}
