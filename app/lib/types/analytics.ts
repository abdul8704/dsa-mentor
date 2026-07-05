// ─── Dashboard Analytics Types ──────────────────────────────────────────────
// These types are used to pass data between server actions and client components.
// They mirror the Supabase schema but are shaped for the dashboard UI.

export interface UserProfile {
  name: string;
  title: string;
  avatarUrl: string;
  level: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  solvedToday: number;
  last7DaysSolved: number;
  /** Percentage change vs previous 7 days (positive = up, negative = down) */
  last7DaysChange: number;
  /** Per-day solved count for last 7 days (index 0 = 7 days ago, index 6 = today) */
  last7DaysBreakdown: number[];
  solvedThisMonth: number;
  solvedPrev30Days: number;
  contestsThisWeek: number;
}

export interface HeatmapDay {
  date: string; // ISO date string e.g. "2025-03-15"
  /** Intensity 0–4 where 0 = no activity, 4 = max activity */
  intensity: 0 | 1 | 2 | 3 | 4;
  count: number;
}

export interface DifficultyStats {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

/**
 * Per-platform difficulty breakdown.
 * Keys are lowercase platform names (e.g. "leetcode", "codeforces") plus
 * "all" for the combined totals across every platform.
 */
export interface PlatformDifficultyMap {
  [platform: string]: DifficultyStats;
}

export interface PlatformStat {
  platform: string;
  icon: string; // Material Symbols icon name
  solvedCount: number;
  rating: number;
  maxRating: number;
  subtitle: string; // e.g. "Global Rank: #4k"
  color: "primary" | "tertiary" | "secondary";
}

export interface ContestRatingPoint {
  date: string;
  rating: number;
  contestId: string;
  platform?: string;
}

export interface ContestRatingData {
  current: number;
  peak: number;
  momChange: number;
  totalContests: number;
  percentile: string;
  history: ContestRatingPoint[];
  platformHistories: Record<string, ContestRatingPoint[]>;
}

export interface TopicStat {
  topic: string;
  percentage: number;
  problemCount: number;
  /** Trend compared to previous period: positive = up, negative = down */
  trend: number;
}

export interface TopicBreakdownData {
  accuracy: number;
  allTime: TopicStat[];
  last7Days: TopicStat[];
}

/** A single row in the "Recently Solved" problems table. */
export interface RecentProblem {
  problemId: string;
  title: string;
  difficulty: string | null;
  rating: number | null;
  platform: string;
  tags: string[];
  solvedDate: string;
  /** True if the user had already solved this problem before this record. */
  alreadySolved: boolean;
}

/** Filters accepted by `getPaginatedSolvedProblems`. All fields are optional/AND-combined. */
export interface SolvedProblemsFilters {
  search?: string;
  platform?: string;
  difficulty?: string;
  topic?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedSolvedProblems {
  problems: RecentProblem[];
  totalCount: number;
}

// ─── Full dashboard data bundle ─────────────────────────────────────────────
export interface DashboardData {
  profile: UserProfile;
  streak: StreakData;
  heatmap: HeatmapDay[];
  difficulty: PlatformDifficultyMap;
  platforms: PlatformStat[];
  contestRating: ContestRatingData;
  topics: TopicBreakdownData;
  recentProblems: RecentProblem[];
}
