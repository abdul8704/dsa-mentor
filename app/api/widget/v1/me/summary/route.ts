import type { NextRequest } from "next/server";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { handleWidget, widgetError, widgetJson } from "@/app/lib/widget-api/http";
import { authenticateWidget } from "@/app/lib/widget-api/tokens";
import { buildWidgetSummary, resolveTimeZone } from "@/app/lib/widget-api/summary";

/**
 * GET /api/widget/v1/me/summary?tz=Asia/Kolkata
 * Authorization: Bearer amw_…
 *
 * Everything the widget renders, in one call.
 */
export async function GET(req: NextRequest) {
    const auth = await authenticateWidget(req).catch(() => undefined);
    if (auth === null) return widgetError(401, "unauthorized", "Invalid or revoked token.");

    // Rate limit per token (falls back to per-IP if auth lookup itself errored).
    return handleWidget(
        req,
        "summary",
        async () => {
            if (!auth) return widgetError(500, "internal_error", "Something went wrong on our side. Please try again later.");
            const timeZone = resolveTimeZone(req.nextUrl.searchParams.get("tz"));
            const data = await buildWidgetSummary(getServiceRoleClient(), auth.userId, timeZone);
            return widgetJson({ data, meta: { servedAt: new Date().toISOString() } });
        },
        auth?.tokenId
    );
}
