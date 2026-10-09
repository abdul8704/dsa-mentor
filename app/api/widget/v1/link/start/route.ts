import type { NextRequest } from "next/server";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { handleWidget, readJson, widgetJson } from "@/app/lib/widget-api/http";
import {
    LINK_CODE_TTL_SECONDS,
    LINK_POLL_INTERVAL_SECONDS,
    cleanDeviceName,
    newDeviceCode,
    newUserCode,
    sha256,
} from "@/app/lib/widget-api/tokens";

/**
 * POST /api/widget/v1/link/start { deviceName? }
 *
 * Step 1 of the pairing flow. The widget keeps `deviceCode` secret and polls
 * with it; the user sees `userCode` and approves it at `verifyUrl`.
 */
export async function POST(req: NextRequest) {
    return handleWidget(req, "start", async () => {
        const body = await readJson(req);
        const db = getServiceRoleClient();
        const deviceName = cleanDeviceName(body.deviceName);

        // Housekeeping: drop expired codes so the table can't grow unbounded.
        await db.from("widget_link_codes").delete().lt("expires_at", new Date(Date.now() - 3600_000).toISOString());

        const deviceCode = newDeviceCode();
        const expiresAt = new Date(Date.now() + LINK_CODE_TTL_SECONDS * 1000).toISOString();

        // A user-code collision is astronomically unlikely, but the column is
        // unique, so retry a few times rather than fail the whole request.
        for (let attempt = 0; attempt < 5; attempt++) {
            const userCode = newUserCode();
            const { error } = await db.from("widget_link_codes").insert({
                device_code_hash: sha256(deviceCode),
                user_code: userCode,
                device_name: deviceName,
                expires_at: expiresAt,
            });
            if (error) {
                if (error.code === "23505") continue;
                throw new Error(`insert link code failed: ${error.message}`);
            }

            const base = (process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).replace(/\/$/, "");
            return widgetJson({
                deviceCode,
                userCode,
                verifyUrl: `${base}/link?code=${encodeURIComponent(userCode)}`,
                expiresIn: LINK_CODE_TTL_SECONDS,
                interval: LINK_POLL_INTERVAL_SECONDS,
            });
        }
        throw new Error("could not allocate a unique user code");
    });
}
