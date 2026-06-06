import { Suspense } from "react";
import AuthPage from "./AuthPage";
import { createSupabaseServerClient } from "../lib/supabase/server-client";
import { isOnboardingCompleted } from "../lib/auth/onboarding";
import { redirect } from "next/navigation";

export default async function Page() {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const completed = await isOnboardingCompleted(user.id);
        redirect(completed ? "/dashboard" : "/onboarding");
    }

    return (
        <Suspense>
            <AuthPage user={null} error={null} />
        </Suspense>
    )
}