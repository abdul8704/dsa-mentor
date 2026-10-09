import type { NextRequest } from "next/server";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { handleWidget, readJson, widgetError, widgetJson } from "@/app/lib/widget-api/http";
import { newAccessToken, sha256 } from "@/app/lib/widget-api/tokens";

/**
 * POST /api/widget/v1/link/token { deviceCode }
 *
 * Step 2: the widget polls this until the user approves. Returns 400
 * `authorization_pending` while waiting. On approval the code is consumed
 * atomically and a fresh token is minted exactly once; only its hash is stored.
 */
export async function POST(req: NextRequest) {
    return handleWidget(req, "token", async () => {
        const body = await readJson(req);
        const deviceCode = typeof body.deviceCode === "string" ? body.deviceCode : "";
        if (deviceCode.length < 20 || deviceCode.length > 100) {
            return widgetError(400, "invalid_request", "deviceCode is required.");
        }

        const db = getServiceRoleClient();
        const hash = sha256(deviceCode);
        const { data: link, error } = await db
            .from("widget_link_codes")
            .select("id, status, user_id, device_name, expires_at")
            .eq("device_code_hash", hash)
            .maybeSingle();
        if (error) throw new Error(`link lookup failed: ${error.message}`);

        if (!link || link.status === "consumed" || new Date(link.expires_at).getTime() < Date.now()) {
            return widgetError(400, "expired_token", "This code has expired. Start again.");
        }
        if (link.status === "denied") return widgetError(403, "access_denied", "The request was denied.");
        if (link.status === "pending" || !link.user_id) {
            return widgetError(400, "authorization_pending", "Waiting for approval.");
        }

        // Claim the approved code; if a concurrent poll won, this returns no row.
        const { data: claimed, error: claimError } = await db
            .from("widget_link_codes")
            .update({ status: "consumed" })
            .eq("id", link.id)
            .eq("status", "approved")
            .select("id")
            .maybeSingle();
        if (claimError) throw new Error(`claim failed: ${claimError.message}`);
        if (!claimed) return widgetError(400, "expired_token", "This code has already been used.");

        const token = newAccessToken();
        const { error: insertError } = await db.from("widget_tokens").insert({
            user_id: link.user_id,
            token_hash: sha256(token),
            device_name: link.device_name,
        });
        if (insertError) throw new Error(`token insert failed: ${insertError.message}`);

        const { data: profile } = await db.from("profile").select("name").eq("user_id", link.user_id).maybeSingle();
        return widgetJson({ token, user: { name: profile?.name ?? null } });
    });
}
