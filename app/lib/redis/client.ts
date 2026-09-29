import "server-only";
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined;
};

/**
 * Builds a connection URL for Redis Cloud from discrete REDIS_HOST/PORT/
 * USERNAME/PASSWORD/TLS vars (as they appear on the Redis Cloud dashboard),
 * for deployments that set those instead of a single REDIS_URL. Returns
 * null when neither is configured, so the caller can fall back to a plain
 * local Redis for dev.
 */
function buildRedisUrlFromParts(): string | null {
    if (!process.env.REDIS_HOST) {
        return null;
    }

    const scheme = process.env.REDIS_TLS === "true" ? "rediss" : "redis";
    const port = process.env.REDIS_PORT ?? "6379";

    let auth = "";
    if (process.env.REDIS_USERNAME) {
        auth = `${encodeURIComponent(process.env.REDIS_USERNAME)}:${encodeURIComponent(process.env.REDIS_PASSWORD ?? "")}@`;
    } else if (process.env.REDIS_PASSWORD) {
        auth = `:${encodeURIComponent(process.env.REDIS_PASSWORD)}@`;
    }

    return `${scheme}://${auth}${process.env.REDIS_HOST}:${port}`;
}

function createRedisInstance(): Redis {
    // REDIS_URL (a full Redis Cloud connection string, e.g.
    // "redis://default:<password>@<host>:<port>") takes priority when set;
    // otherwise build one from the discrete REDIS_HOST/PORT/USERNAME/
    // PASSWORD/TLS vars; otherwise fall back to a plain local Redis for dev.
    const redisUrl = process.env.REDIS_URL || buildRedisUrlFromParts() || "redis://localhost:6379";

    // Redis Cloud's TLS-enabled endpoints use a "rediss://" URL, which
    // ioredis auto-detects — REDIS_TLS is only needed as an explicit
    // override for cases where the URL itself doesn't carry the scheme
    // (e.g. a REDIS_URL that's "redis://..." but the endpoint still expects
    // TLS). Leave it unset/false for a plain, non-TLS Redis Cloud endpoint.
    const useTls = redisUrl.startsWith("rediss://") || process.env.REDIS_TLS === "true";

    const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false, // Fail fast if Redis is down rather than hanging requests
        connectTimeout: 2000,
        tls: useTls ? {} : undefined,
        retryStrategy(times) {
            // Reconnect after a delay, maxing out at 5 seconds
            return Math.min(times * 500, 5000);
        },
    });

    client.on("error", (err) => {
        console.warn(`[redis] Redis connection error: ${err instanceof Error ? err.message : String(err)}`);
    });

    return client;
}

export const redis = globalForRedis.redis ?? createRedisInstance();

if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = redis;
}

/**
 * Retrieves a JSON-parsed cached item from Redis.
 * Returns `null` if key does not exist or if Redis is unreachable.
 */
export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const data = await redis.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
    } catch (error) {
        console.warn(`[redis] Failed to get key "${key}": ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Serializes and stores an item in Redis with a TTL in seconds.
 * Fails silently with a warning if Redis is unreachable.
 */
export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
        const serialized = JSON.stringify(value);
        await redis.set(key, serialized, "EX", ttlSeconds);
    } catch (error) {
        console.warn(`[redis] Failed to set key "${key}": ${error instanceof Error ? error.message : String(error)}`);
    }
}
