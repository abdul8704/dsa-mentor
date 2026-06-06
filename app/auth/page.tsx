import { Suspense } from "react";
import AuthPage from "./AuthPage";
import { createSupabaseServerClient } from "../lib/supabase/server-client";
import { redirect } from "next/navigation";

export default async function Page() {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    // If already logged in, redirect to dashboard
    if (user) {
        redirect("/dashboard");
    }

    return (
        <Suspense>
            <AuthPage user={null} error={null} />
        </Suspense>
    )
}