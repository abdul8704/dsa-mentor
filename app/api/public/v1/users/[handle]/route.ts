import type { NextRequest } from "next/server";
import { handlePublicGet, preflight, publicError } from "@/app/lib/public-api/http";
import { resolvePublicProfile } from "@/app/lib/public-api/profile";
import { normalizeHandle } from "@/app/lib/public-api/widgets";

/**
 * GET /api/public/v1/users/{handle} — which widgets this user has made
 * public, with a link to each. 404 when the handle doesn't exist or the
 * profile isn't public (deliberately the same answer for both).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ handle: string }> }) {
    return handlePublicGet(req, async () => {
        const handle = normalizeHandle((await ctx.params).handle);
        const profile = await resolvePublicProfile(handle);
        if (!profile) return publicError(404, "not_found", "No public profile with that handle.");

        const base = `/api/public/v1/users/${profile.handle}`;
        return {
            data: {
                handle: profile.handle,
                widgets: profile.widgets,
                links: {
                    dashboard: `${base}/dashboard`,
                    ...Object.fromEntries(profile.widgets.map((w) => [w, `${base}/${w}`])),
                },
            },
            meta: { handle: profile.handle },
        };
    });
}

export function OPTIONS() {
    return preflight();
}
