import type { NextRequest } from "next/server";
import { handlePublicGet, preflight } from "@/app/lib/public-api/http";
import { getUpcomingContests } from "@/app/lib/contests/schedule";
import { serializeUpcomingContests } from "@/app/lib/public-api/serializers";

/**
 * GET /api/public/v1/contests/upcoming — the platform-wide contest schedule
 * (next 7 days) shown on the dashboard. Contains no user data, so it needs no
 * opt-in; it's still rate limited like every public endpoint.
 */
export async function GET(req: NextRequest) {
    return handlePublicGet(req, async () => ({
        data: serializeUpcomingContests(await getUpcomingContests()),
    }));
}

export function OPTIONS() {
    return preflight();
}
