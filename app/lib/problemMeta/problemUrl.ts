import "server-only";

/**
 * Parse a pasted problem URL into a platform + canonical problem_id.
 *
 * The problem_id convention MUST match the one used when ingesting solved
 * problems in the worker, otherwise auto-completion (which matches an
 * assigned problem_id against the mentee's solved_problems) will never fire:
 *   - LeetCode:   "LC"  + titleSlug        e.g. LCtwo-sum
 *   - Codeforces: "CF"  + contestId + index e.g. CF1234A
 *   - AtCoder:    "ATC" + taskId           e.g. ATCabc300_a
 */

export type ParsedProblem =
    | { platform: "leetcode"; problem_id: string; slug: string }
    | { platform: "codeforces"; problem_id: string; contestId: string; index: string }
    | { platform: "atcoder"; problem_id: string; taskId: string };

/**
 * Attempts to parse a problem URL. Returns null when the URL is not a
 * recognized problem link, so callers can surface a clean validation error.
 */
export const parseProblemUrl = (rawUrl: string): ParsedProblem | null => {
    let url: URL;
    try {
        url = new URL(rawUrl.trim());
    } catch {
        // Not a valid absolute URL.
        return null;
    }

    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    // Non-empty path segments, lowercased for matching.
    const segments = url.pathname.split("/").filter(Boolean);

    // ---- LeetCode: leetcode.com/problems/<slug>[/description] ----
    if (host === "leetcode.com" || host === "leetcode.cn") {
        const idx = segments.indexOf("problems");
        if (idx !== -1 && segments[idx + 1]) {
            const slug = segments[idx + 1]!.toLowerCase();
            return { platform: "leetcode", problem_id: `LC${slug}`, slug };
        }
        return null;
    }

    // ---- Codeforces ----
    // /problemset/problem/<contestId>/<index>
    // /contest/<contestId>/problem/<index>
    // /gym/<contestId>/problem/<index>
    if (host === "codeforces.com" || host === "m1.codeforces.com" || host === "m2.codeforces.com" || host === "m3.codeforces.com") {
        let contestId: string | undefined;
        let index: string | undefined;

        if (segments[0] === "problemset" && segments[1] === "problem") {
            contestId = segments[2];
            index = segments[3];
        } else if ((segments[0] === "contest" || segments[0] === "gym") && segments[2] === "problem") {
            contestId = segments[1];
            index = segments[3];
        }

        if (contestId && index && /^\d+$/.test(contestId)) {
            const upperIndex = index.toUpperCase();
            return {
                platform: "codeforces",
                problem_id: `CF${contestId}${upperIndex}`,
                contestId,
                index: upperIndex,
            };
        }
        return null;
    }

    // ---- AtCoder: atcoder.jp/contests/<contest>/tasks/<taskId> ----
    if (host === "atcoder.jp") {
        const idx = segments.indexOf("tasks");
        if (idx !== -1 && segments[idx + 1]) {
            const taskId = segments[idx + 1]!.toLowerCase();
            return { platform: "atcoder", problem_id: `ATC${taskId}`, taskId };
        }
        return null;
    }

    return null;
};
