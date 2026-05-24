import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server-client";
import OnboardingForm from "./OnboardingForm";

export default async function Page() {
    const supabase = await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile) {
        await supabase.from("profiles").insert({
            id: user.id,
            onboarding_completed: false,
        });
    }

    if (profile?.onboarding_completed) {
        redirect("/dashboard");
    }

    const { data: platforms } = await supabase.
                                        from("user_platforms")
                                        .select("platform, handle")
                                        .eq("user_id", user.id);

    return (
        <OnboardingForm platforms={platforms} />
    );
}