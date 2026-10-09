import type { NextRequest } from "next/server";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { handleWidget, widgetError, widgetJson } from "@/app/lib/widget-api/http";
import { authenticateWidget } from "@/app/lib/widget-api/tokens";

/** DELETE /api/widget/v1/me/token — the widget disconnects itself (revokes its own token). */
export async function DELETE(req: NextRequest) {
    return handleWidget(req, "disconnect", async () => {
        const auth = await authenticateWidget(req);
        if (!auth) return widgetError(401, "unauthorized", "Invalid or revoked token.");

        const { error } = await getServiceRoleClient()
            .from("widget_tokens")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", auth.tokenId);
        if (error) throw new Error(`revoke failed: ${error.message}`);
        return widgetJson({ ok: true });
    });
}
