import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, clientIp } from "@/app/lib/public-api/rate-limit";

/**
 * Response helpers for /api/widget/v1. These endpoints are called by the
 * desktop app's main process (not a browser), so there is no CORS, and every
 * response is `no-store`.
 */

export type WidgetErrorCode =
    | "invalid_request"
    | "unauthorized"
    | "authorization_pending"
    | "access_denied"
    | "expired_token"
    | "rate_limited"
    | "internal_error";

const NO_STORE = { "Cache-Control": "no-store" };

export function widgetJson(body: unknown, status = 200): NextResponse {
    return NextResponse.json(body, { status, headers: NO_STORE });
}

export function widgetError(status: number, code: WidgetErrorCode, message: string, headers: Record<string, string> = {}): NextResponse {
    return NextResponse.json({ error: { code, message } }, { status, headers: { ...NO_STORE, ...headers } });
}

/**
 * Applies a rate limit, runs the handler and converts unexpected errors to a
 * generic 500 (details are logged, never returned).
 */
export async function handleWidget(
    req: NextRequest,
    bucket: string,
    handler: () => Promise<NextResponse>,
    keyOverride?: string
): Promise<NextResponse> {
    const rl = await checkRateLimit(`widget:${bucket}:${keyOverride ?? clientIp(req.headers)}`);
    if (!rl.allowed) {
        const retryAfter = Math.max(1, rl.resetAt - Math.floor(Date.now() / 1000));
        return widgetError(429, "rate_limited", `Too many requests. Try again in ${retryAfter} seconds.`, {
            "Retry-After": String(retryAfter),
        });
    }
    try {
        return await handler();
    } catch (error) {
        console.error(`[widget-api] ${req.nextUrl.pathname} failed: ${error instanceof Error ? error.message : String(error)}`);
        return widgetError(500, "internal_error", "Something went wrong on our side. Please try again later.");
    }
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
    try {
        const body = await req.json();
        return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}
