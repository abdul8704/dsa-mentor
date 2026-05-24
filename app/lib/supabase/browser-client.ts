"use client";

import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

type SupabaseSchema = Record<string, never> // placeholder object {} that can't contain any data
// Record -> {}, key -> string, value -> never. Means this object can't have any values and is always empty

let client: SupabaseClient<SupabaseSchema> | null = null;

export function getBrowserClient(): SupabaseClient<SupabaseSchema>{
    if(client) // creating a singleton client instance
        return client;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_ANON_KEY;

    if(!supabaseAnonKey || !supabaseUrl) // throw error if either of the env variables is missing to prevent runtime errors when initializing Supabase client
        throw new Error("Missing supabase ENV vars !! ");

    client = createBrowserClient<SupabaseSchema>(supabaseUrl, supabaseAnonKey)
    return client
}