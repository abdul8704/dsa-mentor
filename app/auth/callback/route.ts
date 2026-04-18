import { NextResponse, NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client"

export async function GET(req: NextRequest){
    const { searchParams, origin } = new URL(req.url)
    const code = searchParams.get("code");

    console.log(searchParams, code);

    if(code){
        const supabase = await createSupabaseServerClient();
        await supabase.auth.exchangeCodeForSession(code);
    }
    
    return NextResponse.redirect(`${origin}/dashboard`);
} 