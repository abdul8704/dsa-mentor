import "server-only";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { getCached, setCached, redis } from "@/app/lib/redis/client";
import { HANDLE_PATTERN, isPublicWidget, type PublicWidget } from "./widgets";

/**
 * Resolves a public handle to the user behind it — the opt-in gate for every
 * public endpoint. Returns null unless the user has a `public_profiles` row
 * with `enabled = true`, so a disabled profile is indistinguishable from a
 * handle that never existed.
 */

export interface PublicProfileRecord {
    userId: string;
    handle: string;
    widgets: PublicWidget[];
}

/** How long a handle → user lookup is cached. Settings changes purge it immediately. */
const PROFILE_CACHE_SECONDS = 60;

const profileCacheKey = (handle: string) => `public:v1:profile:${handle}`;

/** Cache entry for "no such public profile", so unknown handles don't hit the DB on every request. */
type CachedProfile = PublicProfileRecord | { missing: true };

export async function resolvePublicProfile(handle: string): Promise<PublicProfileRecord | null> {
    if (!HANDLE_PATTERN.test(handle)) return null;

    const cached = await getCached<CachedProfile>(profileCacheKey(handle));
    if (cached) return "missing" in cached ? null : cached;

    const { data, error } = await getServiceRoleClient()
        .from("public_profiles")
        .select("user_id, handle, enabled, widgets")
        .eq("handle", handle)
        .maybeSingle();

    if (error) {
        // Don't cache failures — the next request should retry the lookup.
        console.error(`[public-api] Failed to resolve handle "${handle}": ${error.message}`);
        throw new Error("profile lookup failed");
    }

    if (!data || !data.enabled) {
        await setCached<CachedProfile>(profileCacheKey(handle), { missing: true }, PROFILE_CACHE_SECONDS);
        return null;
    }

    const record: PublicProfileRecord = {
        userId: data.user_id,
        handle: data.handle,
        widgets: ((data.widgets ?? []) as string[]).filter(isPublicWidget),
    };
    await setCached<CachedProfile>(profileCacheKey(handle), record, PROFILE_CACHE_SECONDS);
    return record;
}

/**
 * Drops every cached public response for a user (and their old/new handle
 * lookups), so turning the profile off or hiding a widget takes effect on
 * our side immediately. CDN copies still expire on their own (see
 * PUBLIC_CACHE_SECONDS in ./http.ts).
 */
export async function purgePublicCache(userId: string, handles: string[]): Promise<void> {
    try {
        const keys: string[] = handles.map(profileCacheKey);
        let cursor = "0";
        do {
            const [next, found] = await redis.scan(cursor, "MATCH", `public:v1:data:${userId}:*`, "COUNT", 100);
            keys.push(...found);
            cursor = next;
        } while (cursor !== "0");
        if (keys.length > 0) await redis.del(...keys);
    } catch (error) {
        console.warn(`[public-api] Failed to purge cache for ${userId}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
