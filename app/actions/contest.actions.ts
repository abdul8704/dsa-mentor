"use server";

import type { UpcomingContest, RecentContestsResult } from "@/app/lib/types/analytics";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import * as schedule from "@/app/lib/contests/schedule";

// The schedule fetchers and the attendance query live in
// app/lib/contests/schedule.ts so the public API can reuse them with its own
// Supabase client. These server actions run them as the signed-in user.

export async function getUpcomingContests(): Promise<UpcomingContest[]> {
  return schedule.getUpcomingContests();
}

export async function getRecentContestsWithAttendance(userId: string): Promise<RecentContestsResult> {
  return schedule.getRecentContestsWithAttendance(await createSupabaseServerClient(), userId);
}

/**
 * Resolves last-7-days contest attendance for several users at once. The
 * schedule (total contests held) is fetched a single time and shared, and a
 * single `user_contest` query covers every user — so this scales to a whole
 * mentee roster without N network round-trips.
 *
 * @returns `total` contests held in the window, plus `attendedByUser` mapping
 *          each userId → how many of those they attended (0 when absent).
 */
export async function getRecentContestAttendanceForUsers(
  userIds: string[],
): Promise<{ total: number; attendedByUser: Record<string, number> }> {
  const attendedByUser: Record<string, number> = {};
  for (const id of userIds) attendedByUser[id] = 0;

  if (userIds.length === 0) return { total: 0, attendedByUser };

  const past = await schedule.getPastContests();
  if (past.length === 0) return { total: 0, attendedByUser };

  const supabase = await createSupabaseServerClient();
  const ids = past.map((c) => c.contestId);

  const { data, error } = await supabase
    .from("user_contest")
    .select("user_id, contest_id")
    .in("user_id", userIds)
    .in("contest_id", ids);

  if (error) {
    console.error(`[contests] Failed to resolve roster attendance: ${error.message}`);
    return { total: past.length, attendedByUser };
  }

  // A user may appear multiple times (one row per attended contest); count
  // distinct contest_ids per user to be safe against any duplicate rows.
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const key = `${row.user_id}::${row.contest_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (row.user_id in attendedByUser) {
      attendedByUser[row.user_id] += 1;
    }
  }

  return { total: past.length, attendedByUser };
}
