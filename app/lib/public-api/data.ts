import "server-only";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { getCached, setCached } from "@/app/lib/redis/client";
import * as queries from "@/app/lib/analytics/queries";
import { getRecentContestsWithAttendance } from "@/app/lib/contests/schedule";
import type { PublicProfileRecord } from "./profile";
import type { PublicWidget } from "./widgets";
import {
    serializeContestRating,
    serializeHeatmap,
    serializeProfile,
    serializeRecentContests,
    serializeRecentProblems,
    serializeStats,
    serializeStreak,
    serializeTopics,
} from "./serializers";

/**
 * Loads one public widget for an already-resolved (opted-in) profile.
 *
 * Reads with the service-role client because the caller is anonymous; that is
 * only safe because `resolvePublicProfile` has already checked the opt-in,
 * and the route checks the widget is in `profile.widgets` before calling.
 * Results are cached in Redis so public traffic doesn't reach the database
 * more than once per widget per DATA_CACHE_SECONDS.
 */

export const DATA_CACHE_SECONDS = 300;

export const RECENT_PROBLEMS_DEFAULT_LIMIT = 20;
export const RECENT_PROBLEMS_MAX_LIMIT = 50;

export interface WidgetOptions {
    /** recent-problems only: 1..RECENT_PROBLEMS_MAX_LIMIT. */
    limit?: number;
}

async function loadWidget(profile: PublicProfileRecord, widget: PublicWidget, options: WidgetOptions): Promise<unknown> {
    const db = getServiceRoleClient();
    const { userId, handle } = profile;

    switch (widget) {
        case "profile": {
            const { data, error } = await db
                .from("profile")
                .select("name, description, avatar_url")
                .eq("user_id", userId)
                .maybeSingle();
            if (error) throw new Error(`profile query failed: ${error.message}`);
            return serializeProfile(handle, data);
        }
        case "streak":
            return serializeStreak(await queries.getStreakData(db, userId));
        case "heatmap":
            return serializeHeatmap(await queries.getHeatmapData(db, userId));
        case "stats": {
            const [difficulty, platforms] = await Promise.all([
                queries.getDifficultyStats(db, userId),
                queries.getPlatformStats(db, userId),
            ]);
            return serializeStats(difficulty, platforms);
        }
        case "contest-rating":
            return serializeContestRating(await queries.getContestRatingData(db, userId));
        case "topics":
            return serializeTopics(await queries.getTopicBreakdown(db, userId));
        case "recent-problems":
            return serializeRecentProblems(
                await queries.getRecentSolvedProblems(db, userId, options.limit ?? RECENT_PROBLEMS_DEFAULT_LIMIT)
            );
        case "contests":
            return serializeRecentContests(await getRecentContestsWithAttendance(db, userId));
    }
}

export async function getWidgetData(
    profile: PublicProfileRecord,
    widget: PublicWidget,
    options: WidgetOptions = {}
): Promise<unknown> {
    const suffix = widget === "recent-problems" ? `:${options.limit ?? RECENT_PROBLEMS_DEFAULT_LIMIT}` : "";
    const key = `public:v1:data:${profile.userId}:${widget}${suffix}`;

    const cached = await getCached<unknown>(key);
    if (cached !== null) return cached;

    const data = await loadWidget(profile, widget, options);
    await setCached(key, data, DATA_CACHE_SECONDS);
    return data;
}
