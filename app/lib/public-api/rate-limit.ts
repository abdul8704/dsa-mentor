import "server-only";
import { redis } from "@/app/lib/redis/client";

/**
 * Fixed-window rate limiter for the public API.
 *
 * Counts requests per client IP per window in Redis, so the limit holds
 * across every serverless instance. If Redis is unreachable it falls back to
 * an in-memory counter per instance: weaker, but still caps a single client
 * hammering one instance instead of failing wide open.
 */

export const PUBLIC_RATE_LIMIT = {
    /** Requests allowed per client IP per window, across all public endpoints. */
    limit: 60,
    windowSeconds: 60,
} as const;

export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    /** Unix seconds when the current window resets. */
    resetAt: number;
}

const memoryWindows = new Map<string, { count: number; resetAt: number }>();

function memoryHit(key: string, resetAt: number): number {
    const now = Math.floor(Date.now() / 1000);
    // Opportunistic cleanup so the map can't grow without bound.
    if (memoryWindows.size > 10_000) {
        for (const [k, v] of memoryWindows) {
            if (v.resetAt <= now) memoryWindows.delete(k);
        }
    }
    const entry = memoryWindows.get(key);
    if (!entry || entry.resetAt <= now) {
        memoryWindows.set(key, { count: 1, resetAt });
        return 1;
    }
    entry.count += 1;
    return entry.count;
}

export async function checkRateLimit(clientKey: string): Promise<RateLimitResult> {
    const { limit, windowSeconds } = PUBLIC_RATE_LIMIT;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % windowSeconds);
    const resetAt = windowStart + windowSeconds;
    const key = `ratelimit:public:${clientKey}:${windowStart}`;

    let count: number;
    try {
        const [[incrErr, value]] = (await redis
            .multi()
            .incr(key)
            .expire(key, windowSeconds + 5)
            .exec()) as [[Error | null, number], [Error | null, number]];
        if (incrErr) throw incrErr;
        count = value;
    } catch {
        count = memoryHit(key, resetAt);
    }

    return {
        allowed: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        resetAt,
    };
}

/**
 * Best-effort client IP. On Vercel `x-real-ip` / the first `x-forwarded-for`
 * entry are set by the platform, not the caller.
 */
export function clientIp(headers: Headers): string {
    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
    const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return forwarded || "unknown";
}
