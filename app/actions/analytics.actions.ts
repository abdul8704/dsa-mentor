"use server";

import type {
  UserProfile,
  StreakData,
  HeatmapDay,
  DifficultyStats,
  PlatformStat,
  ContestRatingData,
  TopicBreakdownData,
  DashboardData,
} from "@/app/lib/types/analytics";
// import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

// ─── Dummy data generators ─────────────────────────────────────────────────

function generateDummyHeatmap(): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const today = new Date();
  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const rand = Math.random();
    let intensity: 0 | 1 | 2 | 3 | 4;
    let count: number;
    if (rand < 0.15) {
      intensity = 0;
      count = 0;
    } else if (rand < 0.35) {
      intensity = 1;
      count = Math.floor(Math.random() * 2) + 1;
    } else if (rand < 0.55) {
      intensity = 2;
      count = Math.floor(Math.random() * 3) + 3;
    } else if (rand < 0.8) {
      intensity = 3;
      count = Math.floor(Math.random() * 4) + 6;
    } else {
      intensity = 4;
      count = Math.floor(Math.random() * 5) + 10;
    }
    days.push({
      date: d.toISOString().split("T")[0],
      intensity,
      count,
    });
  }
  return days;
}

// ─── Server Actions ─────────────────────────────────────────────────────────

export async function getUserProfile(
  _userId: string
): Promise<UserProfile> {
  // TODO: Wire up Supabase
  // const supabase = await createSupabaseServerClient();
  // const { data } = await supabase.from("profile").select("*").eq("user_id", userId).single();
  return {
    name: "Alex Rivera",
    title: "Senior Software Engineer & Algorithm Specialist",
    avatarUrl: "/placeholder-avatar.png",
    level: 7,
  };
}

export async function getStreakData(
  _userId: string
): Promise<StreakData> {
  // TODO: Wire up Supabase
  // const supabase = await createSupabaseServerClient();
  // const { data } = await supabase.from("user-streak").select("*").eq("user_id", userId).single();
  // const { data: dailyCounts } = await supabase.from("daily_count")...
  return {
    currentStreak: 124,
    longestStreak: 218,
    solvedToday: 14,
    last7DaysSolved: 47,
    last7DaysChange: 12,
    last7DaysBreakdown: [4, 6, 8, 7, 9, 6, 7],
    solvedThisMonth: 89,
    solvedPrev30Days: 72,
    contestsThisWeek: 3,
  };
}

export async function getHeatmapData(
  _userId: string
): Promise<HeatmapDay[]> {
  // TODO: Wire up Supabase
  // const supabase = await createSupabaseServerClient();
  // const { data } = await supabase.from("daily_count").select("date, solved").eq("user_id", userId)
  //   .gte("date", oneYearAgo).order("date", { ascending: true });
  return generateDummyHeatmap();
}

export async function getDifficultyStats(
  _userId: string
): Promise<DifficultyStats> {
  // TODO: Wire up Supabase
  // const supabase = await createSupabaseServerClient();
  // const { data } = await supabase.from("solved_problems")
  //   .select("problem_id, problems(difficulty)")
  //   .eq("user_id", userId);
  return {
    easy: 342,
    medium: 412,
    hard: 88,
    total: 842,
  };
}

export async function getPlatformStats(
  _userId: string
): Promise<PlatformStat[]> {
  // TODO: Wire up Supabase
  // const supabase = await createSupabaseServerClient();
  // const { data } = await supabase.from("user_platform_data").select("*").eq("user_id", userId);
  return [
    {
      platform: "LeetCode",
      icon: "code",
      solvedCount: 20,
      rating: 2100,
      maxRating: 2200,
      subtitle: "Global Rank: #4k",
      color: "primary",
    },
    {
      platform: "AtCoder",
      icon: "terminal",
      solvedCount: 34,
      rating: 1820,
      maxRating: 1900,
      subtitle: "1820 Rated",
      color: "tertiary",
    },
    {
      platform: "Codeforces",
      icon: "public",
      solvedCount: 56,
      rating: 1650,
      maxRating: 1700,
      subtitle: "Expert Level",
      color: "secondary",
    },
  ];
}

export async function getContestRatingData(
  _userId: string
): Promise<ContestRatingData> {
  // TODO: Wire up Supabase
  // const supabase = await createSupabaseServerClient();
  // const { data } = await supabase.from("user_contest").select("*").eq("user_id", userId)
  //   .order("date", { ascending: true });
  return {
    current: 2382,
    peak: 2410,
    momChange: 142,
    totalContests: 18,
    percentile: "TOP 2.1%",
    history: [
      { date: "2025-01", rating: 1800, contestId: "c1" },
      { date: "2025-02", rating: 1950, contestId: "c2" },
      { date: "2025-03", rating: 1900, contestId: "c3" },
      { date: "2025-04", rating: 2100, contestId: "c4" },
      { date: "2025-05", rating: 2050, contestId: "c5" },
      { date: "2025-06", rating: 2200, contestId: "c6" },
      { date: "2025-07", rating: 2150, contestId: "c7" },
      { date: "2025-08", rating: 2300, contestId: "c8" },
      { date: "2025-09", rating: 2250, contestId: "c9" },
      { date: "2025-10", rating: 2350, contestId: "c10" },
      { date: "2025-11", rating: 2382, contestId: "c11" },
      { date: "2025-12", rating: 2410, contestId: "c12" },
    ],
  };
}

export async function getTopicBreakdown(
  _userId: string
): Promise<TopicBreakdownData> {
  // TODO: Wire up Supabase
  // const supabase = await createSupabaseServerClient();
  // const { data } = await supabase.from("solved_problems")
  //   .select("problem_id, problems(tags)")
  //   .eq("user_id", userId);
  return {
    accuracy: 78,
    allTime: [
      { topic: "Graphs", percentage: 42, problemCount: 354, trend: 5 },
      { topic: "Trees", percentage: 28, problemCount: 236, trend: 3 },
      { topic: "DP", percentage: 18, problemCount: 152, trend: -2 },
      { topic: "Math", percentage: 12, problemCount: 100, trend: 1 },
    ],
    last7Days: [
      { topic: "Dynamic Programming", percentage: 65, problemCount: 24, trend: 12 },
      { topic: "Binary Search", percentage: 45, problemCount: 15, trend: 8 },
      { topic: "Greedy Algorithms", percentage: 38, problemCount: 12, trend: -4 },
      { topic: "Two Pointers", percentage: 32, problemCount: 10, trend: 5 },
      { topic: "Sliding Window", percentage: 28, problemCount: 9, trend: 3 },
      { topic: "Stack & Queue", percentage: 22, problemCount: 7, trend: -1 },
      { topic: "Backtracking", percentage: 18, problemCount: 6, trend: 2 },
      { topic: "Graph Theory", percentage: 15, problemCount: 5, trend: -3 },
    ],
  };
}

// ─── Aggregated fetch ───────────────────────────────────────────────────────

export async function getDashboardData(
  userId: string
): Promise<DashboardData> {
  const [profile, streak, heatmap, difficulty, platforms, contestRating, topics] =
    await Promise.all([
      getUserProfile(userId),
      getStreakData(userId),
      getHeatmapData(userId),
      getDifficultyStats(userId),
      getPlatformStats(userId),
      getContestRatingData(userId),
      getTopicBreakdown(userId),
    ]);

  return { profile, streak, heatmap, difficulty, platforms, contestRating, topics };
}
