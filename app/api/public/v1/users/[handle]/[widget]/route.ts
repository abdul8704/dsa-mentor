import type { NextRequest } from "next/server";
import { handlePublicGet, preflight, publicError } from "@/app/lib/public-api/http";
import { resolvePublicProfile } from "@/app/lib/public-api/profile";
import { getWidgetData, RECENT_PROBLEMS_DEFAULT_LIMIT, RECENT_PROBLEMS_MAX_LIMIT } from "@/app/lib/public-api/data";
import { isPublicWidget, normalizeHandle, PUBLIC_WIDGETS } from "@/app/lib/public-api/widgets";

/**
 * GET /api/public/v1/users/{handle}/{widget} — one dashboard widget.
 * GET /api/public/v1/users/{handle}/dashboard — every widget the user made
 * public, in one response.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ handle: string; widget: string }> }) {
    return handlePublicGet(req, async () => {
        const params = await ctx.params;
        const handle = normalizeHandle(params.handle);
        const widget = params.widget.toLowerCase();

        if (widget !== "dashboard" && !isPublicWidget(widget)) {
            return publicError(
                404,
                "not_found",
                `Unknown widget "${widget}". Valid widgets: dashboard, ${PUBLIC_WIDGETS.join(", ")}.`
            );
        }

        let limit: number | undefined;
        const rawLimit = req.nextUrl.searchParams.get("limit");
        if (rawLimit !== null) {
            const parsed = Number(rawLimit);
            if (!Number.isInteger(parsed) || parsed < 1 || parsed > RECENT_PROBLEMS_MAX_LIMIT) {
                return publicError(400, "invalid_request", `limit must be an integer from 1 to ${RECENT_PROBLEMS_MAX_LIMIT}.`);
            }
            limit = parsed;
        }

        const profile = await resolvePublicProfile(handle);
        if (!profile) return publicError(404, "not_found", "No public profile with that handle.");

        if (widget === "dashboard") {
            const entries = await Promise.all(
                profile.widgets.map(async (w) => [w, await getWidgetData(profile, w, { limit })] as const)
            );
            return {
                data: { handle: profile.handle, widgets: Object.fromEntries(entries) },
                meta: { handle: profile.handle, widget: "dashboard" },
            };
        }

        if (!profile.widgets.includes(widget)) {
            return publicError(404, "widget_not_public", `${profile.handle} hasn't made "${widget}" public.`);
        }

        return {
            data: await getWidgetData(profile, widget, { limit }),
            meta: {
                handle: profile.handle,
                widget,
                ...(widget === "recent-problems" ? { limit: limit ?? RECENT_PROBLEMS_DEFAULT_LIMIT } : {}),
            },
        };
    });
}

export function OPTIONS() {
    return preflight();
}
