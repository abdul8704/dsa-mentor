import { preflight, publicError } from "@/app/lib/public-api/http";

/**
 * Catch-all for unknown /api/public/* paths. Without it, next.config.ts's
 * `/api/:path*` rewrite would forward them to the worker.
 */
function notFound() {
    return publicError(404, "not_found", "Unknown endpoint. See GET /api/public/v1 for the list of endpoints.");
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const HEAD = notFound;

export function OPTIONS() {
    return preflight();
}
