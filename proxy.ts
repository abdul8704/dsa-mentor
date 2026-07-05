import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

const PUBLIC_ROUTES = ["/", "/auth", "/invite"];
const AUTH_CALLBACK_PREFIX = "/auth/callback";

function isPublicRoute(path: string): boolean {
    return PUBLIC_ROUTES.some(
        (route) => path === route || (route !== "/" && path.startsWith(route))
    );
}

function isAuthCallback(path: string): boolean {
    return path.startsWith(AUTH_CALLBACK_PREFIX);
}

export async function proxy(req: NextRequest) {
    const path = req.nextUrl.pathname;

    if (isAuthCallback(path)) {
        return NextResponse.next();
    }

    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const isPublic = isPublicRoute(path);
    const isOnboarding = path.startsWith("/onboarding");
    const isAuth = path.startsWith("/auth");
    const isEditingOnboarding = req.nextUrl.searchParams.get("edit") === "1";

    if (!user) {
        if (!isPublic) {
            return NextResponse.redirect(new URL("/auth", req.url));
        }

        return NextResponse.next();
    }

    const { data: profile } = await supabase
        .from("profile")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

    const onboardingCompleted = profile?.onboarding_completed ?? false;

    if (isAuth) {
        const destination = onboardingCompleted ? "/dashboard" : "/onboarding";
        return NextResponse.redirect(new URL(destination, req.url));
    }

    if (isOnboarding && onboardingCompleted && !isEditingOnboarding) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (!isPublic && !isOnboarding && !onboardingCompleted) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
