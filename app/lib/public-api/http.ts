import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, clientIp, type RateLimitResult } from "./rate-limit";

/**
 * Response helpers shared by every /api/public/v1 route: CORS, caching
 * headers, rate limiting and the error envelope.
 */

export const API_VERSION = "v1";

/** CDN/browser cache lifetime for successful responses. */
export const PUBLIC_CACHE_SECONDS = 300;

export type PublicErrorCode =
    | "not_found"
    | "widget_not_public"
    | "invalid_request"
    | "rate_limited"
    | "method_not_allowed"
    | "internal_error";

/**
 * Read-only, cookie-free API, so any origin may call it. Credentials are
 * never accepted (no Allow-Credentials), which is what makes `*` safe.
 */
const CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
    "Access-Control-Max-Age": "86400",
};

function rateLimitHeaders(rl: RateLimitResult): Record<string, string> {
    return {
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(rl.resetAt),
    };
}

export function publicError(
    status: number,
    code: PublicErrorCode,
    message: string,
    extraHeaders: Record<string, string> = {}
): NextResponse {
    return NextResponse.json(
        { error: { code, message } },
        { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...extraHeaders } }
    );
}

export function preflight(): NextResponse {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Wraps a public GET handler: applies the per-IP rate limit, turns the
 * handler's result into the `{ data, meta }` envelope with CORS + cache
 * headers, and converts unexpected errors into a generic 500 (internal
 * details are logged, never returned).
 */
export async function handlePublicGet(
    req: NextRequest,
    handler: () => Promise<NextResponse | { data: unknown; meta?: Record<string, unknown> }>
): Promise<NextResponse> {
    const rl = await checkRateLimit(clientIp(req.headers));
    const rlHeaders = rateLimitHeaders(rl);

    if (!rl.allowed) {
        const retryAfter = Math.max(1, rl.resetAt - Math.floor(Date.now() / 1000));
        return publicError(429, "rate_limited", `Too many requests. Try again in ${retryAfter} seconds.`, {
            ...rlHeaders,
            "Retry-After": String(retryAfter),
        });
    }

    try {
        const result = await handler();
        if (result instanceof NextResponse) {
            for (const [k, v] of Object.entries(rlHeaders)) result.headers.set(k, v);
            return result;
        }
        return NextResponse.json(
            {
                data: result.data,
                meta: { apiVersion: API_VERSION, servedAt: new Date().toISOString(), maxAgeSeconds: PUBLIC_CACHE_SECONDS, ...result.meta },
            },
            {
                status: 200,
                headers: {
                    ...CORS_HEADERS,
                    ...rlHeaders,
                    "Cache-Control": `public, max-age=60, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=600`,
                },
            }
        );
    } catch (error) {
        console.error(`[public-api] ${req.nextUrl.pathname} failed: ${error instanceof Error ? error.message : String(error)}`);
        return publicError(500, "internal_error", "Something went wrong on our side. Please try again later.", rlHeaders);
    }
}
