"use server";

import type {
  UserProfile,
  StreakData,
  HeatmapDay,
  PlatformDifficultyMap,
  PlatformStat,
  ContestRatingData,
  TopicBreakdownData,
  RecentProblem,
  SolvedProblemsFilters,
  PaginatedSolvedProblems,
  DashboardData,
} from "@/app/lib/types/analytics";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import * as queries from "@/app/lib/analytics/queries";

// ─── Server Actions ─────────────────────────────────────────────────────────
//
// Thin wrappers that run the shared queries in app/lib/analytics/queries.ts
// with the signed-in user's session client, so Row Level Security decides
// what they can read. The public API calls the same queries with the
// service-role client instead (see app/lib/public-api/).

export async function getUserProfile(userId: string): Promise<UserProfile> {
  return queries.getUserProfile(await createSupabaseServerClient(), userId);
}

export async function getStreakData(userId: string): Promise<StreakData> {
  return queries.getStreakData(await createSupabaseServerClient(), userId);
}

export async function getHeatmapData(userId: string): Promise<HeatmapDay[]> {
  return queries.getHeatmapData(await createSupabaseServerClient(), userId);
}

export async function getDifficultyStats(userId: string): Promise<PlatformDifficultyMap> {
  return queries.getDifficultyStats(await createSupabaseServerClient(), userId);
}

export async function getPlatformStats(userId: string): Promise<PlatformStat[]> {
  return queries.getPlatformStats(await createSupabaseServerClient(), userId);
}

export async function getContestRatingData(userId: string): Promise<ContestRatingData> {
  return queries.getContestRatingData(await createSupabaseServerClient(), userId);
}

export async function getTopicBreakdown(userId: string): Promise<TopicBreakdownData> {
  return queries.getTopicBreakdown(await createSupabaseServerClient(), userId);
}

export async function getRecentSolvedProblems(userId: string, limit: number = 30): Promise<RecentProblem[]> {
  return queries.getRecentSolvedProblems(await createSupabaseServerClient(), userId, limit);
}

export async function getPaginatedSolvedProblems(
  userId: string,
  page: number,
  pageSize: number,
  filters: SolvedProblemsFilters = {}
): Promise<PaginatedSolvedProblems> {
  return queries.getPaginatedSolvedProblems(await createSupabaseServerClient(), userId, page, pageSize, filters);
}

export async function getUserTopicOptions(userId: string): Promise<string[]> {
  return queries.getUserTopicOptions(await createSupabaseServerClient(), userId);
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  return queries.getDashboardData(await createSupabaseServerClient(), userId);
}
