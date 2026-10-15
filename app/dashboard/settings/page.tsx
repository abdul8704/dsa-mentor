import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server-client";
import { ensureProfile } from "../../lib/auth/onboarding";
import OnboardingForm from "../../onboarding/OnboardingForm";

export const metadata: Metadata = {
    title: "AlgoMentor | Settings",
};

export default async function SettingsPage() {
    const supabase = await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    await ensureProfile(user.id);

    const [{ data: platforms }, { data: profile }] = await Promise.all([
        supabase.from("user_platforms").select("platform, handle").eq("user_id", user.id),
        supabase.from("profile").select("name, description, avatar_url").eq("user_id", user.id).maybeSingle(),
    ]);

    return (
        <OnboardingForm
            platforms={platforms}
            profile={{
                name: profile?.name ?? user.user_metadata?.name ?? "",
                description: profile?.description ?? "",
                avatarUrl: profile?.avatar_url ?? "",
            }}
            isEditing
        />
    );
}
