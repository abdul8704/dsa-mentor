import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server-client";
import { ensureProfile, isOnboardingCompleted } from "../lib/auth/onboarding";
import OnboardingForm from "./OnboardingForm";

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ edit?: string }>;
}) {
    const { edit } = await searchParams;
    const isEditing = edit === "1";

    const supabase = await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    await ensureProfile(user.id);

    if (!isEditing && (await isOnboardingCompleted(user.id))) {
        redirect("/dashboard");
    }

    const [{ data: platforms }, { data: profile }] = await Promise.all([
        supabase
            .from("user_platforms")
            .select("platform, handle")
            .eq("user_id", user.id),
        supabase
            .from("profile")
            .select("name, description, avatar_url")
            .eq("user_id", user.id)
            .maybeSingle(),
    ]);

    return (
        <OnboardingForm
            platforms={platforms}
            profile={{
                name: profile?.name ?? user.user_metadata?.name ?? "",
                description: profile?.description ?? "",
                avatarUrl: profile?.avatar_url ?? "",
            }}
            isEditing={isEditing}
        />
    );
}