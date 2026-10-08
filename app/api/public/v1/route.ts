import type { NextRequest } from "next/server";
import { handlePublicGet, preflight } from "@/app/lib/public-api/http";
import { PUBLIC_WIDGETS } from "@/app/lib/public-api/widgets";

/** GET /api/public/v1 — discovery document listing the available endpoints. */
export async function GET(req: NextRequest) {
    return handlePublicGet(req, async () => ({
        data: {
            name: "AlgoMentor public API",
            version: "v1",
            endpoints: {
                user: "/api/public/v1/users/{handle}",
                dashboard: "/api/public/v1/users/{handle}/dashboard",
                widget: "/api/public/v1/users/{handle}/{widget}",
                upcomingContests: "/api/public/v1/contests/upcoming",
            },
            widgets: PUBLIC_WIDGETS,
        },
    }));
}

export function OPTIONS() {
    return preflight();
}
