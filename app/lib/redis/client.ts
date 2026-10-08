import "server-only";
import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as {
    redis: UpstashRedis | IORedis | undefined;
};

function createRedisInstance(): UpstashRedis | IORedis {
    // Upstash
    if (
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
        return new UpstashRedis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }

    // Local Redis
    return new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
        retryStrategy(times) {
            return Math.min(times * 500, 5000);
        },
    });
}

export const redis =
    globalForRedis.redis ?? createRedisInstance();

if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = redis;
}

/**
 * Get a cached JSON value.
 */
export async function getCached<T>(
    key: string
): Promise<T | null> {
    try {
        const data = await redis.get(key);

        if (!data) {
            return null;
        }

        return JSON.parse(data as string) as T;
    } catch (error) {
        console.warn(
            `[redis] Failed to get key "${key}": ${
                error instanceof Error
                    ? error.message
                    : String(error)
            }`
        );

        return null;
    }
}

/**
 * Set a cached JSON value with TTL.
 */
export async function setCached<T>(
    key: string,
    value: T,
    ttlSeconds: number
): Promise<void> {
    try {
        const serialized = JSON.stringify(value);

        if (redis instanceof UpstashRedis) {
            // Upstash
            await redis.set(key, serialized, {
                ex: ttlSeconds,
            });
        } else {
            // ioredis
            await redis.set(
                key,
                serialized,
                "EX",
                ttlSeconds
            );
        }
    } catch (error) {
        console.warn(
            `[redis] Failed to set key "${key}": ${
                error instanceof Error
                    ? error.message
                    : String(error)
            }`
        );
    }
}