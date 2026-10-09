import "server-only";
import type {
    ContestRatingData,
    HeatmapDay,
    PlatformDifficultyMap,
    PlatformStat,
    RecentContestsResult,
    RecentProblem,
    StreakData,
    TopicBreakdownData,
    UpcomingContest,
} from "@/app/lib/types/analytics";

/**
 * Public response shapes. Every field is copied explicitly (an allow-list),
 * so adding a column to a dashboard query never leaks it into the public API.
 * Dashboard-only presentation fields (icons, colors, placeholder titles) are
 * dropped here too.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDaysAgo(n: number): string {
    return new Date(Date.now() - n * DAY_MS).toISOString().split("T")[0];
}

/** Canonical problem page for a stored problem_id, or null if the format isn't recognized. */
export function problemUrl(problemId: string): string | null {
    let m: RegExpMatchArray | null;
    if ((m = problemId.match(/^LC(.+)$/))) return `https://leetcode.com/problems/${m[1]}/`;
    if ((m = problemId.match(/^CF(\d+)([A-Za-z]\d?)$/))) return `https://codeforces.com/problemset/problem/${m[1]}/${m[2]}`;
    if ((m = problemId.match(/^ATC(([a-z0-9_-]+)_[a-z0-9]+)$/i))) return `https://atcoder.jp/contests/${m[2]}/tasks/${m[1]}`;
    if ((m = problemId.match(/^CSES(\d+)$/))) return `https://cses.fi/problemset/task/${m[1]}`;
    return null;
}

export function serializeProfile(handle: string, row: { name: string | null; description: string | null; avatar_url: string | null } | null) {
    return {
        handle,
        name: row?.name ?? handle,
        bio: row?.description ?? null,
        avatarUrl: row?.avatar_url || null,
    };
}

export function serializeStreak(s: StreakData) {
    return {
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak,
        solvedToday: s.solvedToday,
        solvedTodayByPlatform: s.solvedTodayByPlatform,
        last7Days: {
            solved: s.last7DaysSolved,
            byPlatform: s.last7DaysByPlatform,
            changePercent: s.last7DaysChange,
            daily: s.last7DaysBreakdown.map((count, i) => ({ date: isoDaysAgo(6 - i), count })),
        },
        last30Days: {
            solved: s.solvedThisMonth,
            byPlatform: s.last30DaysByPlatform,
            previous30Days: s.solvedPrev30Days,
        },
        contestsLast7Days: s.contestsThisWeek,
    };
}

export function serializeHeatmap(days: HeatmapDay[]) {
    return {
        from: days[0]?.date ?? null,
        to: days[days.length - 1]?.date ?? null,
        totalSolved: days.reduce((n, d) => n + d.count, 0),
        activeDays: days.filter((d) => d.count > 0).length,
        days: days.map((d) => ({ date: d.date, count: d.count, level: d.intensity })),
    };
}

export function serializeStats(difficulty: PlatformDifficultyMap, platforms: PlatformStat[]) {
    const all = difficulty.all ?? { easy: 0, medium: 0, hard: 0, total: 0 };
    return {
        totals: { solved: all.total, easy: all.easy, medium: all.medium, hard: all.hard },
        platforms: platforms.map((p) => {
            const key = p.platform.toLowerCase();
            const d = difficulty[key];
            return {
                platform: key,
                solved: p.solvedCount ?? 0,
                easy: d?.easy ?? 0,
                medium: d?.medium ?? 0,
                hard: d?.hard ?? 0,
                rating: p.rating ?? null,
                maxRating: p.maxRating ?? null,
            };
        }),
    };
}

export function serializeContestRating(c: ContestRatingData) {
    return {
        current: c.current,
        peak: c.peak,
        lastChange: c.momChange,
        totalContests: c.totalContests,
        history: c.history.map((p) => ({
            date: p.date,
            rating: p.rating,
            contestId: p.contestId,
            platform: p.platform ?? null,
        })),
    };
}

export function serializeTopics(t: TopicBreakdownData) {
    return {
        allTime: t.allTime.map((s) => ({ topic: s.topic, count: s.problemCount, percentage: s.percentage })),
        last7Days: t.last7Days.map((s) => ({
            topic: s.topic,
            count: s.problemCount,
            percentage: s.percentage,
            changeVsPrevious7Days: s.trend,
        })),
    };
}

export function serializeRecentProblems(problems: RecentProblem[]) {
    return {
        problems: problems.map((p) => ({
            problemId: p.problemId,
            title: p.title,
            platform: p.platform,
            difficulty: p.difficulty,
            rating: p.rating,
            tags: p.tags,
            solvedDate: p.solvedDate,
            isRepeatSolve: p.alreadySolved,
            url: problemUrl(p.problemId),
        })),
    };
}

export function serializeRecentContests(r: RecentContestsResult) {
    return {
        windowDays: 7,
        attended: r.attendedCount,
        total: r.total,
        contests: r.contests.map((c) => ({
            platform: c.platform,
            name: c.name,
            url: c.url,
            startTime: c.startTime,
            durationMinutes: c.durationMinutes,
            attended: c.attended,
        })),
    };
}

export function serializeUpcomingContests(contests: UpcomingContest[]) {
    return {
        contests: contests.map((c) => ({
            platform: c.platform,
            name: c.name,
            url: c.url,
            startTime: c.startTime,
            durationMinutes: c.durationMinutes,
        })),
    };
}
