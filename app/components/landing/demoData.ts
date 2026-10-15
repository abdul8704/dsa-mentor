import type { HeatmapDay, PlatformDifficultyMap, StreakData } from "@/app/lib/types/analytics";

/**
 * Sample data for the landing page's live previews. Deterministic (seeded),
 * so the server and client render identical markup.
 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export const DEMO_STREAK: StreakData = {
  currentStreak: 23,
  longestStreak: 41,
  solvedToday: 5,
  solvedTodayByPlatform: { codeforces: 2, leetcode: 3, atcoder: 0, cses: 0 },
  last7DaysSolved: 29,
  last7DaysChange: 18,
  last7DaysBreakdown: [3, 5, 2, 6, 4, 4, 5],
  last7DaysBreakdownByPlatform: [
    { codeforces: 1, leetcode: 2 },
    { codeforces: 2, leetcode: 2, atcoder: 1 },
    { leetcode: 1, cses: 1 },
    { codeforces: 3, leetcode: 1, atcoder: 2 },
    { leetcode: 3, cses: 1 },
    { codeforces: 2, leetcode: 2 },
    { codeforces: 2, leetcode: 3 },
  ],
  last7DaysByPlatform: { codeforces: 10, leetcode: 14, atcoder: 3, cses: 2 },
  solvedThisMonth: 112,
  last30DaysByPlatform: { codeforces: 41, leetcode: 52, atcoder: 11, cses: 8 },
  solvedPrev30Days: 94,
  contestsThisWeek: 2,
};

export const DEMO_DIFFICULTY: PlatformDifficultyMap = {
  all: { easy: 318, medium: 402, hard: 121, total: 912 },
  codeforces: { easy: 96, medium: 88, hard: 52, total: 301 },
  leetcode: { easy: 164, medium: 241, hard: 57, total: 462 },
  atcoder: { easy: 38, medium: 41, hard: 9, total: 88 },
  cses: { easy: 20, medium: 32, hard: 3, total: 61 },
};

/** ~6 months of activity ending today, with weekday rhythm and a few rest days. */
export function demoHeatmap(days = 182): HeatmapDay[] {
  const rand = rng(7);
  const out: HeatmapDay[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const r = rand();
    const count = r < 0.14 ? 0 : Math.round(r * (weekend ? 9 : 6));
    const intensity = (count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4) as HeatmapDay["intensity"];
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ date: iso, count, intensity });
  }
  return out;
}

export interface DemoMentee {
  name: string;
  initials: string;
  streak: number;
  week: number[];
  lastActive: string;
  inactive: boolean;
  tasksDone: number;
  tasksTotal: number;
  tags: string[];
}

export const DEMO_MENTEES: DemoMentee[] = [
  { name: "Priya S.", initials: "PS", streak: 31, week: [4, 6, 3, 7, 5, 6, 8], lastActive: "Today", inactive: false, tasksDone: 9, tasksTotal: 10, tags: ["dp", "graphs"] },
  { name: "Omar K.", initials: "OK", streak: 12, week: [2, 3, 0, 4, 2, 5, 3], lastActive: "Today", inactive: false, tasksDone: 6, tasksTotal: 10, tags: ["greedy", "math"] },
  { name: "Lena M.", initials: "LM", streak: 4, week: [0, 1, 2, 0, 3, 2, 1], lastActive: "Yesterday", inactive: false, tasksDone: 4, tasksTotal: 8, tags: ["binary search"] },
  { name: "Ravi T.", initials: "RT", streak: 0, week: [3, 1, 0, 0, 0, 0, 0], lastActive: "5 days ago", inactive: true, tasksDone: 2, tasksTotal: 8, tags: ["strings"] },
];
