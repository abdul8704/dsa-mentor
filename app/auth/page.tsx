import AuthPage from "./AuthPage";
import { createSupabaseServerClient } from "../lib/supabase/server-client";

export default async function Page() {
    const supabase = await createSupabaseServerClient();

    const res = await supabase.auth.getSession(); //get current session from supabase, if user is logged in it will return session object otherwise null

    console.log("Session data in page.tsx:", res.data); //log session data to verify if we are getting the correct session information
    return (
        <AuthPage user={null} error={null} />
    )
}