import "server-only";
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined;
};

function createRedisInstance(): Redis {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false, // Fail fast if Redis is down rather than hanging requests
        connectTimeout: 2000,
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
