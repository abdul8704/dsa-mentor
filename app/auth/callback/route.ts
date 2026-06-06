import { NextResponse, NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client"

export async function GET(req: NextRequest){
    const { searchParams, origin } = new URL(req.url)
    const code = searchParams.get("code");

    if(code){
        try {
            const supabase = await createSupabaseServerClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);

            if (error) {
                console.error("OAuth code exchange error:", error.message);
                const errorMessage = encodeURIComponent(error.message);
                return NextResponse.redirect(
                    `${origin}/auth?error=${errorMessage}`
                );
            }
        } catch (err) {
            console.error("Unexpected error during OAuth callback:", err);
            const errorMessage = encodeURIComponent(
                "Something went wrong during sign-in. Please try again."
            );
            return NextResponse.redirect(
                `${origin}/auth?error=${errorMessage}`
            );
        }
    } else {
        // No code param — something went wrong with the OAuth flow
        const errorParam = searchParams.get("error_description") 
            || searchParams.get("error") 
            || "Google sign-in was cancelled or failed. Please try again.";
        const errorMessage = encodeURIComponent(errorParam);
        return NextResponse.redirect(
            `${origin}/auth?error=${errorMessage}`
        );
    }
    
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(`${origin}/auth`);
    }

    const { data: profile } = await supabase
        .from("profile")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

    const destination = profile?.onboarding_completed ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(`${origin}${destination}`);
}