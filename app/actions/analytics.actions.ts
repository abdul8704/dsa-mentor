"use server";

import type {
  UserProfile,
  StreakData,
  HeatmapDay,
  DifficultyStats,
  PlatformDifficultyMap,
  PlatformStat,
  ContestRatingData,
  ContestRatingPoint,
  TopicBreakdownData,
  TopicStat,
  DashboardData,
} from "@/app/lib/types/analytics";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

// ─── Helper: date strings ───────────────────────────────────────────────────

/** Returns today's date as an ISO string (YYYY-MM-DD) in UTC. */
function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/** Returns an ISO date string N days before today. */
function daysAgoISO(n: number): string {
  const d: Date = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ─── Platform config maps ───────────────────────────────────────────────────

/** Maps platform name → Material Symbols icon name. */
const PLATFORM_ICON_MAP: Record<string, string> = {
  leetcode: "code",
  codeforces: "public",
  atcoder: "terminal",
};

/** Maps platform name → color key for the UI. */
const PLATFORM_COLOR_MAP: Record<string, "primary" | "tertiary" | "secondary"> = {
  leetcode: "primary",
  atcoder: "tertiary",
  codeforces: "secondary",
};

// ─── Server Actions ─────────────────────────────────────────────────────────

/**
 * Fetches the user's profile from the `profile` table.
 * Title, avatarUrl, and level are not stored in DB — they remain defaults.
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profile")
    .select("name")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return { name: "User", title: "", avatarUrl: "", level: 1 };
  }

  const profile: UserProfile = {
    name: data.name ?? "User",
    title: "DSA Enthusiast",
    avatarUrl: "",
    level: 1,
  };

  return profile;
}

/**
 * Fetches all streak-related statistics.
 *
 * Aggregates data from three tables:
 * - `user-streak` → current/longest streak
 * - `solved_problems` → solved today, last 7/30/60 day counts, daily breakdown
 * - `user_contest` → contests attended this week
 */
export async function getStreakData(userId: string): Promise<StreakData> {
  const supabase = await createSupabaseServerClient();

  const today: string = todayISO();
  const sevenDaysAgo: string = daysAgoISO(7);
  const fourteenDaysAgo: string = daysAgoISO(14);
  const thirtyDaysAgo: string = daysAgoISO(30);
  const sixtyDaysAgo: string = daysAgoISO(60);

  // Fire all independent queries in parallel
  const [
    streakResult,
    solvedTodayResult,
    last7Result,
    prev7Result,
    last30Result,
    prev30Result,
    breakdownResult,
    contestsResult,
  ] = await Promise.all([
    // 1. Current & longest streak from user-streak
    supabase
      .from("user-streak")
      .select("curr_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle(),

    // 2. Solved today count
    supabase
      .from("solved_problems")
      .select("problem_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("solved_date", today),

    // 3. Last 7 days count
    supabase
      .from("solved_problems")
      .select("problem_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("solved_date", sevenDaysAgo),

    // 4. Previous 7 days count (days 8–14 ago)
    supabase
      .from("solved_problems")
      .select("problem_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("solved_date", fourteenDaysAgo)
      .lt("solved_date", sevenDaysAgo),

    // 5. Last 30 days count
    supabase
      .from("solved_problems")
      .select("problem_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("solved_date", thirtyDaysAgo),

    // 6. Previous 30 days (days 31–60 ago)
    supabase
      .from("solved_problems")
      .select("problem_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("solved_date", sixtyDaysAgo)
      .lt("solved_date", thirtyDaysAgo),

    // 7. Per-day breakdown for the last 7 days
    supabase
      .from("solved_problems")
      .select("solved_date")
      .eq("user_id", userId)
      .gte("solved_date", sevenDaysAgo),

    // 8. Contests attended this week
    supabase
      .from("user_contest")
      .select("contest_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("date", sevenDaysAgo),
  ]);

  // ── Extract values with safe defaults ──
  const currentStreak: number = streakResult.data?.curr_streak ?? 0;
  const longestStreak: number = streakResult.data?.longest_streak ?? 0;
  const solvedToday: number = solvedTodayResult.count ?? 0;
  const last7DaysSolved: number = last7Result.count ?? 0;
  const prev7DaysSolved: number = prev7Result.count ?? 0;
  const solvedThisMonth: number = last30Result.count ?? 0;
  const solvedPrev30Days: number = prev30Result.count ?? 0;
  const contestsThisWeek: number = contestsResult.count ?? 0;

  // Percentage change vs previous 7 days
  const last7DaysChange: number =
    prev7DaysSolved > 0
      ? Math.round(((last7DaysSolved - prev7DaysSolved) / prev7DaysSolved) * 100)
      : last7DaysSolved > 0
        ? 100
        : 0;

  // Build per-day breakdown array (index 0 = 7 days ago, index 6 = today)
  const last7DaysBreakdown: number[] = new Array(7).fill(0);
  if (breakdownResult.data) {
    const dateCountMap: Record<string, number> = {};
    for (const row of breakdownResult.data) {
      const d: string = row.solved_date;
      dateCountMap[d] = (dateCountMap[d] ?? 0) + 1;
    }
    for (let i = 0; i < 7; i++) {
      const dateStr: string = daysAgoISO(6 - i);
      last7DaysBreakdown[i] = dateCountMap[dateStr] ?? 0;
    }
  }

  // Log any errors for debugging
  if (streakResult.error) console.error("Streak query error:", streakResult.error);
  if (solvedTodayResult.error) console.error("Solved today error:", solvedTodayResult.error);
  if (breakdownResult.error) console.error("Breakdown query error:", breakdownResult.error);

  const streakData: StreakData = {
    currentStreak,
    longestStreak,
    solvedToday,
    last7DaysSolved,
    last7DaysChange,
    last7DaysBreakdown,
    solvedThisMonth,
    solvedPrev30Days,
    contestsThisWeek,
  };

  return streakData;
}

/**
 * Fetches heatmap data from the `daily_count` table for the past ~364 days.
 * Missing dates are filled in with zero-intensity entries.
 */
export async function getHeatmapData(userId: string): Promise<HeatmapDay[]> {
  const supabase = await createSupabaseServerClient();

  const startDate: string = daysAgoISO(363);

  const { data, error } = await supabase
    .from("daily_count")
    .select("date, solved")
    .eq("user_id", userId)
    .gte("date", startDate)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching heatmap data:", error);
    return [];
  }

  // Build a lookup map from the query results
  const solvedByDate: Record<string, number> = {};
  if (data) {
    for (const row of data) {
      solvedByDate[row.date] = row.solved ?? 0;
    }
  }

  // Fill in every date for the last 364 days
  const heatmap: HeatmapDay[] = [];
  for (let i = 363; i >= 0; i--) {
    const dateStr: string = daysAgoISO(i);
    const count: number = solvedByDate[dateStr] ?? 0;
    const intensity: 0 | 1 | 2 | 3 | 4 = mapCountToIntensity(count);
    heatmap.push({ date: dateStr, intensity, count });
  }

  return heatmap;
}

/**
 * Maps a solved count to a 0–4 intensity level for the heatmap.
 * 0 problems → 0 | 1 problem → 1 | 2-3 → 2 | 4-5 → 3 | 6+ → 4
 */
function mapCountToIntensity(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

/**
 * Fetches difficulty breakdown grouped by platform from `user_platform_data`.
 *
 * The table already stores `easy`, `medium`, and `hard` counts per platform,
 * so we don't need to join `solved_problems` with `problems`.
 *
 * @returns A map where each key is a lowercase platform name (plus "all" for
 *          the combined view). Each value is a `DifficultyStats` object.
 */
export async function getDifficultyStats(userId: string): Promise<PlatformDifficultyMap> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_platform_data")
    .select("platform, easy, medium, hard, solved_count")
    .eq("user_id", userId);

    if (error) {
    console.error("Error fetching difficulty stats:", error);
    const empty: DifficultyStats = { easy: 0, medium: 0, hard: 0, total: 0 };
    return { all: empty };
  }

  if (!data || data.length === 0) {
    const empty: DifficultyStats = { easy: 0, medium: 0, hard: 0, total: 0 };
    return { all: empty };
  }

  // Accumulate per-platform and combined counts
  let allEasy = 0, allMedium = 0, allHard = 0, allTotal = 0;
  const result: PlatformDifficultyMap = {};

  for (const row of data) {
    const platform: string = (row.platform ?? "unknown").toLowerCase();
    const easy: number = row.easy ?? 0;
    const medium: number = row.medium ?? 0;
    const hard: number = row.hard ?? 0;
    // Use solved_count as the authoritative total — easy/medium/hard may be
    // NULL or may not sum to solved_count if some problems lack difficulty tags.
    const total: number = row.solved_count ?? (easy + medium + hard);

    result[platform] = { easy, medium, hard, total };

    allEasy += easy;
    allMedium += medium;
    allHard += hard;
    allTotal += total;
  }

  result["all"] = {
    easy: allEasy,
    medium: allMedium,
    hard: allHard,
    total: allTotal,
  };

  return result;
}

/**
 * Fetches per-platform stats from `user_platform_data`.
 * Maps each row to a `PlatformStat` with appropriate icon and color.
 */
export async function getPlatformStats(userId: string): Promise<PlatformStat[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_platform_data")
    .select("platform, solved_count, rating, max_rating")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching platform stats:", error);
    return [];
  }

  if (!data) return [];

  const platforms: PlatformStat[] = data.map((row) => {
    const platformKey: string = (row.platform ?? "unknown").toLowerCase();
    const icon: string = PLATFORM_ICON_MAP[platformKey] ?? "code";
    const color = PLATFORM_COLOR_MAP[platformKey] ?? "primary";
    const subtitle: string = `${row.rating} Rated`;

    const stat: PlatformStat = {
      platform: row.platform ?? "Unknown",
      icon,
      solvedCount: row.solved_count,
      rating: row.rating,
      maxRating: row.max_rating,
      subtitle,
      color,
    };

    return stat;
  });

  return platforms;
}

/**
 * Fetches contest rating history from `user_contest`, ordered by date.
 *
 * Builds both a flat `history` array (for the "All" view) and a per-platform
 * `platformHistories` map (for the platform filter dropdown).
 */
export async function getContestRatingData(userId: string): Promise<ContestRatingData> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_contest")
    .select("contest_id, date, platform, rating, rank")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching contest rating data:", error);
    const empty: ContestRatingData = {
      current: 0,
      peak: 0,
      momChange: 0,
      totalContests: 0,
      percentile: "—",
      history: [],
      platformHistories: {},
    };
    return empty;
  }

  if (!data || data.length === 0) {
    const empty: ContestRatingData = {
      current: 0,
      peak: 0,
      momChange: 0,
      totalContests: 0,
      percentile: "—",
      history: [],
      platformHistories: {},
    };
    return empty;
  }

  // Build flat history and per-platform history
  const history: ContestRatingPoint[] = [];
  const platformHistories: Record<string, ContestRatingPoint[]> = {};

  for (const row of data) {
    const point: ContestRatingPoint = {
      date: row.date ?? "",
      rating: row.rating ?? 0,
      contestId: row.contest_id,
      platform: row.platform,
    };

    history.push(point);

    const platformKey: string = row.platform;
    if (!platformHistories[platformKey]) {
      platformHistories[platformKey] = [];
    }
    platformHistories[platformKey].push(point);
  }

  // Derive summary stats
  const totalContests: number = data.length;
  const latestRating: number = data[data.length - 1].rating ?? 0;
  const previousRating: number =
    data.length >= 2 ? (data[data.length - 2].rating ?? 0) : 0;
  const peakRating: number = Math.max(...data.map((r) => r.rating ?? 0));
  const momChange: number = latestRating - previousRating;

  const result: ContestRatingData = {
    current: latestRating,
    peak: peakRating,
    momChange,
    totalContests,
    percentile: "—",
    history,
    platformHistories,
  };

  return result;
}

/**
 * Fetches topic breakdown from `solved_problems` joined with `problems.tags`.
 *
 * Produces two lists:
 * - `allTime`: tag distribution across all solved problems
 * - `last7Days`: tag distribution for problems solved in the last 7 days,
 *    with a `trend` showing percentage change vs the previous 7 days
 */
export async function getTopicBreakdown(userId: string): Promise<TopicBreakdownData> {
  const supabase = await createSupabaseServerClient();

  const fourteenDaysAgo: string = daysAgoISO(14);
  const sevenDaysAgo: string = daysAgoISO(7);

  // Fetch all solved problems with their tags — we need all-time for the
  // donut and last 14 days for the trend comparison
  const [allTimeResult, recentResult] = await Promise.all([
    supabase
      .from("solved_problems")
      .select("solved_date, problems(tags)")
      .eq("user_id", userId),

    supabase
      .from("solved_problems")
      .select("solved_date, problems(tags)")
      .eq("user_id", userId)
      .gte("solved_date", fourteenDaysAgo),
  ]);

  if (allTimeResult.error) {
    console.error("Error fetching all-time topics:", allTimeResult.error);
  }
  if (recentResult.error) {
    console.error("Error fetching recent topics:", recentResult.error);
  }

  // ── All-time topic stats ──
  const allTimeTopics: TopicStat[] = buildTopicStats(allTimeResult.data ?? []);

  // ── Last 7 days vs previous 7 days ──
  const last7Data = (recentResult.data ?? []).filter(
    (r) => r.solved_date >= sevenDaysAgo
  );
  const prev7Data = (recentResult.data ?? []).filter(
    (r) => r.solved_date >= fourteenDaysAgo && r.solved_date < sevenDaysAgo
  );

  const last7Counts: Record<string, number> = countTags(last7Data);
  const prev7Counts: Record<string, number> = countTags(prev7Data);
  const totalLast7: number = Object.values(last7Counts).reduce((a, b) => a + b, 0) || 1;

  const last7Topics: TopicStat[] = Object.entries(last7Counts)
    .map(([topic, count]): TopicStat => {
      const prevCount: number = prev7Counts[topic] ?? 0;
      const trend: number = count - prevCount; // Absolute difference
      return {
        topic,
        percentage: Math.round((count / totalLast7) * 100),
        problemCount: count,
        trend,
      };
    })
    .sort((a, b) => b.problemCount - a.problemCount);

  const result: TopicBreakdownData = {
    accuracy: 0, // No accuracy data available in schema
    allTime: allTimeTopics,
    last7Days: last7Topics,
  };

  return result;
}

/**
 * Builds an array of TopicStat from an array of solved problem rows.
 * Each row is expected to have `problems.tags: string[] | null`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTopicStats(rows: any[]): TopicStat[] {
  const tagCounts: Record<string, number> = countTags(rows);
  const total: number = Object.values(tagCounts).reduce((a, b) => a + b, 0) || 1;

  const stats: TopicStat[] = Object.entries(tagCounts)
    .map(([topic, count]): TopicStat => ({
      topic,
      percentage: Math.round((count / total) * 100),
      problemCount: count,
      trend: 0, // No trend for all-time
    }))
    .sort((a, b) => b.problemCount - a.problemCount);

  return stats;
}

/**
 * Counts tag occurrences across an array of solved problem rows.
 * Flattens all `problems.tags` arrays and returns { tagName: count }.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countTags(rows: any[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const row of rows) {
    // Supabase types the join as an array (isOneToOne: false), but it
    // returns a single object since we join via problem_id FK.
    const problemData = row.problems as unknown as { tags: string[] | null } | null;
    const tags: string[] = problemData?.tags ?? [];
    for (const tag of tags) {
      const normalized: string = tag.trim();
      if (normalized) {
        counts[normalized] = (counts[normalized] ?? 0) + 1;
      }
    }
  }

  return counts;
}

// ─── Aggregated fetch ───────────────────────────────────────────────────────

/**
 * Fetches ALL dashboard data in parallel and returns a single `DashboardData` bundle.
 * This is the primary entry point called by the dashboard page.
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [profile, streak, heatmap, difficulty, platforms, contestRating, topics]: [
    UserProfile,
    StreakData,
    HeatmapDay[],
    PlatformDifficultyMap,
    PlatformStat[],
    ContestRatingData,
    TopicBreakdownData,
  ] = await Promise.all([
    getUserProfile(userId),
    getStreakData(userId),
    getHeatmapData(userId),
    getDifficultyStats(userId),
    getPlatformStats(userId),
    getContestRatingData(userId),
    getTopicBreakdown(userId),
  ]);

  const data: DashboardData = {
    profile,
    streak,
    heatmap,
    difficulty,
    platforms,
    contestRating,
    topics,
  };

  return data;
}
