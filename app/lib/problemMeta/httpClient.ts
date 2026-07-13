import "server-only";

/**
 * Hardened HTTP client for fetching problem metadata from external platforms
 * (Codeforces pages/API, AtCoder/kenkoooo resources, LeetCode GraphQL).
 *
 * Goals — behave like a polite browser and never get rate-limited/blocked:
 *   - Send realistic browser headers (a missing/empty User-Agent is the most
 *     common reason a scrape gets a 403).
 *   - Serialize requests per-host through a queue with a minimum interval +
 *     jitter, so we never hammer a single host with parallel requests.
 *   - Retry transient failures (403/429/503/network) with exponential backoff.
 *   - Enforce a per-request timeout via AbortController.
 *   - Provide an in-memory TTL cache + single-flight so large catalog dumps
 *     (CF problemset, AtCoder problems.json) are fetched at most once per TTL.
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

// Minimum spacing between requests to the same host (ms). Codeforces is the
// strictest, so we throttle it hardest.
const HOST_MIN_INTERVAL_MS: Record<string, number> = {
    "codeforces.com": 2_000,
    "kenkoooo.com": 1_000,
    "leetcode.com": 1_000,
};
const FALLBACK_MIN_INTERVAL_MS = 800;

const BROWSER_HEADERS: Record<string, string> = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/json,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const jitter = (ms: number): number => ms + Math.floor(Math.random() * (ms * 0.25));

// ── Per-host serial queue ────────────────────────────────────────────────
// Each host gets a promise chain; new requests append to the tail and wait for
// the previous one plus the min interval, guaranteeing spacing + no parallelism.
const hostChains = new Map<string, Promise<void>>();
const lastRequestAt = new Map<string, number>();

function hostOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
        return "unknown";
    }
}

/**
 * Schedules `task` on the given host's serial queue, ensuring the configured
 * minimum interval has elapsed since the previous request to that host.
 */
async function runOnHostQueue<T>(host: string, task: () => Promise<T>): Promise<T> {
    const minInterval = HOST_MIN_INTERVAL_MS[host] ?? FALLBACK_MIN_INTERVAL_MS;
    const previous = hostChains.get(host) ?? Promise.resolve();

    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    // Append this request to the tail of the host chain.
    hostChains.set(host, previous.then(() => gate));

    // Wait for our turn.
    await previous;

    try {
        const since = Date.now() - (lastRequestAt.get(host) ?? 0);
        if (since < minInterval) {
            await sleep(jitter(minInterval - since));
        }
        return await task();
    } finally {
        lastRequestAt.set(host, Date.now());
        // Let the next queued request proceed.
        release();
    }
}

function isRetryableStatus(status: number): boolean {
    return status === 403 || status === 429 || status === 500 || status === 502 || status === 503;
}

export interface FetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    /** Extra label for logs (e.g. "CF problem page"). */
    label?: string;
}

/**
 * Low-level fetch with browser headers, timeout, per-host throttling and
 * exponential backoff. Throws on non-OK after exhausting retries.
 */
export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
    const host = hostOf(url);
    const label = options.label ?? url;

    return runOnHostQueue(host, async () => {
        let lastError: unknown;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

            try {
                console.log(`[http] ${options.method ?? "GET"} ${label} (attempt ${attempt}/${MAX_ATTEMPTS})`);
                const init: RequestInit = {
                    method: options.method ?? "GET",
                    headers: { ...BROWSER_HEADERS, ...(options.headers ?? {}) },
                    signal: controller.signal,
                };
                // Only attach a body when present (exactOptionalPropertyTypes-safe).
                if (options.body !== undefined) {
                    init.body = options.body;
                }
                const res = await fetch(url, init);

                if (res.ok) {
                    return res;
                }

                // Non-retryable client errors (e.g. 404) fail fast.
                if (!isRetryableStatus(res.status)) {
                    throw new Error(`${label} responded ${res.status} ${res.statusText}`);
                }

                lastError = new Error(`${label} responded ${res.status} ${res.statusText}`);
                console.warn(`[http] Retryable ${res.status} for ${label}`);
            } catch (err: unknown) {
                lastError = err;
                const message = err instanceof Error ? err.message : String(err);
                console.warn(`[http] Error on attempt ${attempt} for ${label}: ${message}`);
            } finally {
                clearTimeout(timer);
            }

            // Backoff before the next attempt (1s, 4s), with jitter.
            if (attempt < MAX_ATTEMPTS) {
                const backoff = jitter(attempt * attempt * 1_000);
                await sleep(backoff);
            }
        }

        throw new Error(
            `Failed to fetch ${label} after ${MAX_ATTEMPTS} attempts: ${
                lastError instanceof Error ? lastError.message : String(lastError)
            }`
        );
    });
}

/** Convenience: fetch and parse JSON. */
export async function fetchJson<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
    const res = await fetchWithRetry(url, options);
    return (await res.json()) as T;
}

/** Convenience: fetch and read text (HTML). */
export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
    const res = await fetchWithRetry(url, options);
    return await res.text();
}

// ── In-memory TTL cache with single-flight ───────────────────────────────
interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}
const cacheStore = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Returns a cached value or computes it via `loader`, caching for `ttlMs`.
 * Concurrent callers for the same key share a single in-flight promise
 * (single-flight), so we never fetch the same big catalog twice at once.
 */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
    if (entry && entry.expiresAt > now) {
        return entry.value;
    }

    const existing = inFlight.get(key) as Promise<T> | undefined;
    if (existing) {
        return existing;
    }

    const promise = (async () => {
        try {
            const value = await loader();
            cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
            return value;
        } finally {
            inFlight.delete(key);
        }
    })();

    inFlight.set(key, promise);
    return promise;
}
