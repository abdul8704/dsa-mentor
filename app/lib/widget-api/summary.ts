import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDifficultyStats, getPlatformStats, getUserProfile } from "@/app/lib/analytics/queries";
import { serializeStats } from "@/app/lib/public-api/serializers";

/**
 * Payload for the desktop widget: today's solves by platform (in the
 * widget's own timezone), the same all-platform totals as the dashboard,
 * and a 7-day series.
 *
 * Reads with the service-role client, so every query is scoped to the userId
 * resolved from the widget token.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TZ = "UTC";

/** Returns a valid IANA zone name, or UTC when the input is missing/unknown. */
export function resolveTimeZone(raw: string | null): string {
    if (!raw || raw.length > 64) return DEFAULT_TZ;
    try {
        new Intl.DateTimeFormat("en-CA", { timeZone: raw });
        return raw;
    } catch {
        return DEFAULT_TZ;
    }
}

/** YYYY-MM-DD for an instant, as seen in `timeZone`. */
function localDate(instant: Date | number, timeZone: string): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

export interface WidgetSummary {
    user: { name: string; avatarUrl: string | null };
    timeZone: string;
    date: string;
    solvedToday: { total: number; platforms: { platform: string; count: number }[] };
    totals: ReturnType<typeof serializeStats>["totals"];
    platforms: ReturnType<typeof serializeStats>["platforms"];
    /** One entry per local day; `platforms` lists that day's distinct solves per platform (highest first). */
    last7Days: { date: string; count: number; platforms: { platform: string; count: number }[] }[];
}

export async function buildWidgetSummary(db: SupabaseClient, userId: string, timeZone: string): Promise<WidgetSummary> {
    const now = Date.now();
    // 8 days back covers 7 local days in any timezone (offsets are within ±14h).
    const since = new Date(now - 8 * DAY_MS).toISOString();

    const [profile, difficulty, platformStats, solvedRes] = await Promise.all([
        getUserProfile(db, userId),
        getDifficultyStats(db, userId),
        getPlatformStats(db, userId),
        db.from("solved_problems").select("problem_id, platform, solved_at").eq("user_id", userId).gte("solved_at", since),
    ]);
    if (solvedRes.error) throw new Error(`solved_problems query failed: ${solvedRes.error.message}`);

    const days: string[] = [];
    for (let i = 6; i >= 0; i--) days.push(localDate(now - i * DAY_MS, timeZone));
    const today = days[days.length - 1];

    // Distinct problems per local day, and per platform within each day.
    const perDay = new Map<string, Set<string>>(days.map((d) => [d, new Set()]));
    const perDayPlatform = new Map<string, Map<string, Set<string>>>(days.map((d) => [d, new Map()]));
    for (const row of (solvedRes.data ?? []) as { problem_id: string; platform: string; solved_at: string }[]) {
        const day = localDate(new Date(row.solved_at), timeZone);
        const byPlatform = perDayPlatform.get(day);
        if (!byPlatform) continue;
        perDay.get(day)!.add(row.problem_id);
        const platform = (row.platform ?? "unknown").toLowerCase();
        if (!byPlatform.has(platform)) byPlatform.set(platform, new Set());
        byPlatform.get(platform)!.add(row.problem_id);
    }

    const platformCounts = (day: string) =>
        [...(perDayPlatform.get(day)?.entries() ?? [])]
            .map(([platform, set]) => ({ platform, count: set.size }))
            .sort((a, b) => b.count - a.count || a.platform.localeCompare(b.platform));
    const todayPlatforms = platformCounts(today);

    const { totals, platforms } = serializeStats(difficulty, platformStats);

    return {
        user: { name: profile.name, avatarUrl: profile.avatarUrl || null },
        timeZone,
        date: today,
        solvedToday: { total: perDay.get(today)?.size ?? 0, platforms: todayPlatforms },
        totals,
        platforms,
        last7Days: days.map((date) => ({ date, count: perDay.get(date)?.size ?? 0, platforms: platformCounts(date) })),
    };
}
