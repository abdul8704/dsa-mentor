import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client"

const PROTECTED_ROUTES = ["/dashboard"];
const AUTH_ROUTES = ["/auth"]

export async function proxy(req: NextRequest){
    const supabase = await createSupabaseServerClient();

    const { data: { session } } = await supabase.auth.getSession();

    const path = req.nextUrl.pathname;
    const isProtected = PROTECTED_ROUTES.some((route) => path.startsWith(route));
    const isAuth = AUTH_ROUTES.some((route) => path.startsWith(route));

    if(session && isAuth)
        return NextResponse.redirect(new URL("/dashboard", req.url));

    if(!session && isProtected)
        return NextResponse.redirect(new URL("/auth", req.url));

    return NextResponse.next();
}