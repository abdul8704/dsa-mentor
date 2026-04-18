import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers"; //gives access to request cookies in Next.js server

export function getEnvVariable(){
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_ANON_KEY;

    if(!supabaseAnonKey || !supabaseUrl) // throw error if either of the env variables is missing to prevent runtime errors when initializing Supabase client
        throw new Error("Missing supabase ENV vars !! ");

    return {
        supabaseAnonKey,
        supabaseUrl
    }
}

export async function createSupabaseServerClient() {
    const cookieStore = await cookies();  //read cookies from the incoming request

    const { supabaseAnonKey, supabaseUrl } = getEnvVariable();

    // create supabase instance on the server 
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            // get all cookie from request, so supabase can identify user
            getAll() {
                return cookieStore.getAll();
            },
            // lets supabase update the cookies
            setAll(cookieToSet) {
                try{
                    cookieToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    })
                }
                catch(err){
                    console.error("Error setting cookies in Supabase server client:", err);
                }
            }
        }
    });
}