"use server";

import type { UpcomingContest, RecentContest, RecentContestsResult } from "@/app/lib/types/analytics";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

// ─── Raw platform response shapes (trimmed to the fields we use) ───────────

interface CodeforcesContestListItem {
  id: number;
  name: string;
  phase: string;
  startTimeSeconds?: number;
  durationSeconds: number;
}

interface CodeforcesContestListResponse {
  status: string;
  result?: CodeforcesContestListItem[];
}

interface LeetCodeAllContestsItem {
  title: string;
  titleSlug: string;
  startTime: number; // unix seconds
  duration: number; // seconds
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
// Cache the (public, platform-wide) contest schedules for a while — they
// change rarely and there's no per-user data involved.
const REVALIDATE_SECONDS = 1800;

// ─── Codeforces ──────────────────────────────────────────────────────────

async function getUpcomingCodeforcesContests(): Promise<UpcomingContest[]> {
  try {
    const res = await fetch("https://codeforces.com/api/contest.list", {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];

    const json = (await res.json()) as CodeforcesContestListResponse;
    if (json.status !== "OK" || !Array.isArray(json.result)) return [];

    return json.result
      .filter((c) => c.phase === "BEFORE" && typeof c.startTimeSeconds === "number")
      .map((c) => ({
        platform: "codeforces" as const,
        name: c.name,
        url: `https://codeforces.com/contests/${c.id}`,
        startTime: new Date(c.startTimeSeconds! * 1000).toISOString(),
        durationMinutes: Math.round(c.durationSeconds / 60),
      }));
  } catch (error) {
    console.error(`[contests] Failed to fetch Codeforces contests: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}

// ─── LeetCode ────────────────────────────────────────────────────────────

async function getUpcomingLeetCodeContests(): Promise<UpcomingContest[]> {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query upcomingContests {
            allContests {
              title
              titleSlug
              startTime
              duration
            }
          }
        `,
      }),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];

    const json = (await res.json()) as { data?: { allContests?: LeetCodeAllContestsItem[] } };
    const contests = json.data?.allContests;
    if (!Array.isArray(contests)) return [];

    const now = Date.now();
    return contests
      .filter((c) => typeof c.startTime === "number" && c.startTime * 1000 > now)
      .map((c) => ({
        platform: "leetcode" as const,
        name: c.title,
        url: `https://leetcode.com/contest/${c.titleSlug}`,
        startTime: new Date(c.startTime * 1000).toISOString(),
        durationMinutes: Math.round(c.duration / 60),
      }));
  } catch (error) {
    console.error(`[contests] Failed to fetch LeetCode contests: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}

// ─── AtCoder ─────────────────────────────────────────────────────────────
// AtCoder has no public schedule API — kenkoooo's community dataset (used
// elsewhere for rating history) only covers *concluded* contests. Instead,
// we scrape the "Upcoming Contests" table straight from the contests page,
// which is the same data AtCoder's own UI renders.

/** Decodes the handful of HTML entities that can appear in contest titles. */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Parses AtCoder's "YYYY-MM-DD HH:MM:SS+ZZZZ" timestamp into an ISO string. */
function parseAtCoderStartTime(raw: string): string | null {
  const normalized = raw.trim().replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Parses an AtCoder duration string like "02:00" or "240:00" (HH:MM) into minutes. */
function parseAtCoderDuration(raw: string): number {
  const [hours, minutes] = raw.trim().split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(hours)) return 0;
  return hours * 60 + (Number.isNaN(minutes) ? 0 : minutes);
}

// Matches each upcoming-contest row: start time, contest slug + name, duration.
const ATCODER_ROW_REGEX =
  /<time[^>]*>([^<]+)<\/time>[\s\S]*?<a href="\/contests\/([^"]+)">([^<]+)<\/a>[\s\S]*?<td[^>]*class="text-center">([\d:]+)<\/td>/g;

async function getUpcomingAtCoderContests(): Promise<UpcomingContest[]> {
  try {
    const res = await fetch("https://atcoder.jp/contests/", {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];

    const html = await res.text();
    const sectionStart = html.indexOf('id="contest-table-upcoming"');
    if (sectionStart === -1) return [];
    // The upcoming-contests table ends right before the next <hr> (which
    // precedes the "Daily/Recent Contests" tables) — bound the scrape there
    // so we never pick up already-started or past contests.
    const sectionEnd = html.indexOf("<hr>", sectionStart);
    const section = sectionEnd === -1 ? html.slice(sectionStart) : html.slice(sectionStart, sectionEnd);

    const contests: UpcomingContest[] = [];
    const regex = new RegExp(ATCODER_ROW_REGEX);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(section)) !== null) {
      const [, rawStart, slug, rawName, rawDuration] = match;
      const startTime = parseAtCoderStartTime(rawStart);
      if (!startTime) continue;

      contests.push({
        platform: "atcoder",
        name: decodeHtmlEntities(rawName.trim()),
        url: `https://atcoder.jp/contests/${slug}`,
        startTime,
        durationMinutes: parseAtCoderDuration(rawDuration),
      });
    }
    return contests;
  } catch (error) {
    console.error(`[contests] Failed to fetch AtCoder contests: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}

// ─── Combined, filtered, sorted ─────────────────────────────────────────────

/**
 * Contests starting within the next 7 days across Codeforces, LeetCode, and
 * AtCoder, sorted by start time. Each platform is fetched independently and
 * degrades to an empty list on failure, so one platform being unreachable
 * never breaks the whole widget. This is public, non-user-specific data, so
 * it's fetched directly rather than through the worker service.
 */
export async function getUpcomingContests(): Promise<UpcomingContest[]> {
  const [codeforces, leetcode, atcoder] = await Promise.all([
    getUpcomingCodeforcesContests(),
    getUpcomingLeetCodeContests(),
    getUpcomingAtCoderContests(),
  ]);

  const now = Date.now();
  const cutoff = now + SEVEN_DAYS_MS;

  return [...codeforces, ...leetcode, ...atcoder]
    .filter((c) => {
      const startMs = new Date(c.startTime).getTime();
      return startMs >= now && startMs <= cutoff;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

// ─── Past contests (last 7 days) ────────────────────────────────────────────
// Mirrors the upcoming-contest fetchers but for contests that have already
// started/finished, tagging each with a `contestId` that matches the format
// the worker writes into `user_contest` — so we can tell which the user
// actually attended.

/** A recent contest before attendance is resolved. */
type PastContestBase = Omit<RecentContest, "attended">;

/**
 * Slugifies a LeetCode contest title exactly like the worker does when it
 * builds the stored `contest_id`, so IDs line up for attendance matching.
 */
function slugifyLeetCodeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getPastCodeforcesContests(): Promise<PastContestBase[]> {
  try {
    const res = await fetch("https://codeforces.com/api/contest.list", {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];

    const json = (await res.json()) as CodeforcesContestListResponse;
    if (json.status !== "OK" || !Array.isArray(json.result)) return [];

    return json.result
      .filter((c) => c.phase === "FINISHED" && typeof c.startTimeSeconds === "number")
      .map((c) => ({
        platform: "codeforces" as const,
        name: c.name,
        url: `https://codeforces.com/contests/${c.id}`,
        startTime: new Date(c.startTimeSeconds! * 1000).toISOString(),
        durationMinutes: Math.round(c.durationSeconds / 60),
        contestId: `CF-${c.id}`,
      }));
  } catch (error) {
    console.error(`[contests] Failed to fetch past Codeforces contests: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}

async function getPastLeetCodeContests(): Promise<PastContestBase[]> {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query pastContests {
            allContests {
              title
              titleSlug
              startTime
              duration
            }
          }
        `,
      }),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];

    const json = (await res.json()) as { data?: { allContests?: LeetCodeAllContestsItem[] } };
    const contests = json.data?.allContests;
    if (!Array.isArray(contests)) return [];

    const now = Date.now();
    return contests
      .filter((c) => typeof c.startTime === "number" && c.startTime * 1000 <= now)
      .map((c) => ({
        platform: "leetcode" as const,
        name: c.title,
        url: `https://leetcode.com/contest/${c.titleSlug}`,
        startTime: new Date(c.startTime * 1000).toISOString(),
        durationMinutes: Math.round(c.duration / 60),
        contestId: `LC-${slugifyLeetCodeTitle(c.title)}`,
      }));
  } catch (error) {
    console.error(`[contests] Failed to fetch past LeetCode contests: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}

async function getPastAtCoderContests(): Promise<PastContestBase[]> {
  try {
    const res = await fetch("https://atcoder.jp/contests/", {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];

    const html = await res.text();
    const sectionStart = html.indexOf('id="contest-table-recent"');
    if (sectionStart === -1) return [];
    // The recent-contests table runs to the end of the contents block; bound
    // it at the next </table> so we don't spill into unrelated markup.
    const tableEnd = html.indexOf("</table>", sectionStart);
    const section = tableEnd === -1 ? html.slice(sectionStart) : html.slice(sectionStart, tableEnd);

    const contests: PastContestBase[] = [];
    const regex = new RegExp(ATCODER_ROW_REGEX);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(section)) !== null) {
      const [, rawStart, slug, rawName, rawDuration] = match;
      const startTime = parseAtCoderStartTime(rawStart);
      if (!startTime) continue;

      contests.push({
        platform: "atcoder",
        name: decodeHtmlEntities(rawName.trim()),
        url: `https://atcoder.jp/contests/${slug}`,
        startTime,
        durationMinutes: parseAtCoderDuration(rawDuration),
        contestId: `ATC-${slug}`,
      });
    }
    return contests;
  } catch (error) {
    console.error(`[contests] Failed to fetch past AtCoder contests: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}

/**
 * Contests that started within the last 7 days across Codeforces, LeetCode,
 * and AtCoder, sorted newest-first. Each carries a `contestId` matching the
 * stored `user_contest` format so attendance can be resolved.
 */
async function getPastContests(): Promise<PastContestBase[]> {
  const [codeforces, leetcode, atcoder] = await Promise.all([
    getPastCodeforcesContests(),
    getPastLeetCodeContests(),
    getPastAtCoderContests(),
  ]);

  const now = Date.now();
  const cutoff = now - SEVEN_DAYS_MS;

  return [...codeforces, ...leetcode, ...atcoder]
    .filter((c) => {
      const startMs = new Date(c.startTime).getTime();
      return startMs <= now && startMs >= cutoff;
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

/**
 * Returns the last-7-days contests across all platforms, each flagged with
 * whether the given user attended (i.e. has a `user_contest` row for it — the
 * worker only records contests where the user made at least one submission /
 * has a rating change). Also returns the attended/total tally used by the
 * "Contests Attended" stat.
 */
export async function getRecentContestsWithAttendance(userId: string): Promise<RecentContestsResult> {
  const past = await getPastContests();

  if (past.length === 0) {
    return { contests: [], attendedCount: 0, total: 0 };
  }

  const supabase = await createSupabaseServerClient();
  const ids = past.map((c) => c.contestId);

  const { data, error } = await supabase
    .from("user_contest")
    .select("contest_id")
    .eq("user_id", userId)
    .in("contest_id", ids);

  if (error) {
    console.error(`[contests] Failed to resolve attendance: ${error.message}`);
  }

  const attendedSet = new Set<string>((data ?? []).map((r) => r.contest_id));

  const contests: RecentContest[] = past.map((c) => ({
    ...c,
    attended: attendedSet.has(c.contestId),
  }));

  const attendedCount = contests.reduce((n, c) => n + (c.attended ? 1 : 0), 0);

  return { contests, attendedCount, total: contests.length };
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

  const past = await getPastContests();
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
