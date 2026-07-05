import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client (server-only).
 *
 * This client uses the SUPABASE_SERVICE_ROLE_KEY and therefore BYPASSES Row
 * Level Security. It must NEVER be imported into client components and must
 * only be used AFTER verifying that the caller is authorized (e.g. an active
 * mentorship row links the mentor to the mentee).
 *
 * We use it for the one thing the session (anon-key) client cannot do: read a
 * mentee's analytics rows on behalf of their verified mentor.
 */

let serviceClient: SupabaseClient | null = null;

/**
 * Returns a singleton service-role client. Throws if the environment is not
 * configured, so misconfiguration fails loudly on the server rather than
 * silently returning empty data.
 */
export function getServiceRoleClient(): SupabaseClient {
    if (serviceClient) {
        return serviceClient;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        throw new Error(
            "Missing service-role Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
        );
    }

    serviceClient = createClient(supabaseUrl, serviceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    return serviceClient;
}
