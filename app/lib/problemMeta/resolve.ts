import "server-only";
import * as cheerio from "cheerio";
import axios from "axios";
import type { Database } from "@/types/db";
import { parseProblemUrl, type ParsedProblem } from "./problemUrl";
import { fetchJson, fetchText, cached } from "./httpClient";
import { difficultyMap } from "./difficulty";

export type ProblemEntry = Database["public"]["Tables"]["problems"]["Insert"];

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const CODEFORCES_API_BASE_URL = "https://codeforces.com/api";

// Catalog caches live ~6h — these dumps change rarely and are large.
const CATALOG_TTL_MS = 6 * 60 * 60 * 1000;

interface LeetCodeQuestion {
    questionId: string;
    title: string;
    titleSlug: string;
    difficulty: string;
    topicTags: { slug: string }[];
}

/**
 * Resolve full problem metadata for a pasted URL.
 *
 * Returns a `problems`-table-shaped row (problem_id, platform, title,
 * difficulty, rating, tags) ready to upsert. Throws with a clear message if the
 * URL is unsupported or metadata cannot be resolved from any source.
 */
export const fetchProblemMeta = async (rawUrl: string): Promise<ProblemEntry> => {
    const parsed = parseProblemUrl(rawUrl);
    if (!parsed) {
        throw new Error("Unsupported or malformed problem URL. Use a LeetCode, Codeforces, or AtCoder problem link.");
    }

    console.log(`[problemMeta] Resolving ${parsed.platform} problem ${parsed.problem_id}`);

    switch (parsed.platform) {
        case "leetcode":
            return fetchLeetCodeMeta(parsed);
        case "codeforces":
            return fetchCodeforcesMeta(parsed);
        case "atcoder":
            return fetchAtcoderMeta(parsed);
    }
};

// ── LeetCode: official GraphQL by slug ───────────────────────────────────
async function fetchLeetCodeMeta(
    parsed: Extract<ParsedProblem, { platform: "leetcode" }>
): Promise<ProblemEntry> {
    const { data } = await axios.post(
        LEETCODE_GRAPHQL_URL,
        {
            query: `
                query getQuestion($titleSlug: String!) {
                question(titleSlug: $titleSlug) {
                    questionId
                    title
                    titleSlug
                    difficulty
                    topicTags {
                        slug
                    }
                }
                }
            `,
            variables: { titleSlug: parsed.slug },
        },
        { headers: { "Content-Type": "application/json" } }
    );

    const question: LeetCodeQuestion | null | undefined = data?.data?.question;

    if (!question) {
        throw new Error(`LeetCode problem "${parsed.slug}" not found.`);
    }

    return {
        problem_id: parsed.problem_id,
        platform: "leetcode",
        title: question.title ?? parsed.slug,
        difficulty: question.difficulty ? question.difficulty.toLowerCase() : "unknown",
        rating: null,
        tags: (question.topicTags ?? []).map((tag) => tag.slug.toLowerCase()),
    };
}

// ── Codeforces: cached problemset.problems API (primary) + scrape fallback ──
interface CfProblem {
    contestId?: number;
    index: string;
    name: string;
    rating?: number;
    tags: string[];
}

/** Fetch + cache the entire Codeforces problemset, keyed by `${contestId}${index}`. */
async function getCodeforcesCatalog(): Promise<Map<string, CfProblem>> {
    return cached("cf-problemset", CATALOG_TTL_MS, async () => {
        console.log("[problemMeta] Loading Codeforces problemset catalog...");
        const data = await fetchJson<{ status: string; result?: { problems: CfProblem[] } }>(
            `${CODEFORCES_API_BASE_URL}/problemset.problems`,
            { label: "CF problemset.problems" }
        );

        const map = new Map<string, CfProblem>();
        for (const p of data.result?.problems ?? []) {
            if (p.contestId != null) {
                map.set(`${p.contestId}${p.index.toUpperCase()}`, p);
            }
        }
        console.log(`[problemMeta] Cached ${map.size} Codeforces problems`);
        return map;
    });
}

async function fetchCodeforcesMeta(
    parsed: Extract<ParsedProblem, { platform: "codeforces" }>
): Promise<ProblemEntry> {
    const key = `${parsed.contestId}${parsed.index}`;

    // Primary: official catalog lookup.
    try {
        const catalog = await getCodeforcesCatalog();
        const hit = catalog.get(key);
        if (hit) {
            const rating = hit.rating ?? 0;
            return {
                problem_id: parsed.problem_id,
                platform: "codeforces",
                title: hit.name,
                difficulty: rating ? difficultyMap("codeforces", rating) : "unknown",
                rating: hit.rating ?? null,
                tags: (hit.tags ?? []).map((t) => t.toLowerCase()),
            };
        }
        console.warn(`[problemMeta] ${key} not in CF catalog; falling back to page scrape`);
    } catch (err) {
        console.warn(
            `[problemMeta] CF catalog unavailable (${err instanceof Error ? err.message : err}); scraping page`
        );
    }

    // Fallback: scrape the problem page.
    return scrapeCodeforcesProblem(parsed);
}

/** Scrape a Codeforces problem page for title, rating and tags (fallback path). */
async function scrapeCodeforcesProblem(
    parsed: Extract<ParsedProblem, { platform: "codeforces" }>
): Promise<ProblemEntry> {
    const url = `https://codeforces.com/problemset/problem/${parsed.contestId}/${parsed.index}`;
    const html = await fetchText(url, { label: `CF problem page ${parsed.problem_id}` });
    const $ = cheerio.load(html);

    // Title lives in .problem-statement .title as e.g. "A. Theatre Square".
    const rawTitle = $(".problem-statement .title").first().text().trim();
    const title = rawTitle.replace(/^[A-Z]\d*\.\s*/, "") || parsed.problem_id;

    // Tags + rating are in the sidebar tag boxes; rating is the "*NNNN" tag.
    const tags: string[] = [];
    let rating: number | null = null;
    $(".tag-box").each((_, el) => {
        const text = $(el).text().trim();
        if (!text) return;
        const ratingMatch = text.match(/^\*(\d+)$/);
        if (ratingMatch) {
            rating = Number(ratingMatch[1]);
        } else {
            tags.push(text.toLowerCase());
        }
    });

    if (!rawTitle) {
        throw new Error(`Could not scrape Codeforces problem ${parsed.problem_id}.`);
    }

    return {
        problem_id: parsed.problem_id,
        platform: "codeforces",
        title,
        difficulty: rating ? difficultyMap("codeforces", rating) : "unknown",
        rating,
        tags,
    };
}

// ── AtCoder: kenkoooo static resources (title + estimated difficulty) ─────
interface AtcoderProblemInfo {
    id: string;
    contest_id: string;
    name: string;
    title: string;
}

async function getAtcoderProblems(): Promise<Map<string, AtcoderProblemInfo>> {
    return cached("atc-problems", CATALOG_TTL_MS, async () => {
        console.log("[problemMeta] Loading AtCoder problems catalog...");
        const list = await fetchJson<AtcoderProblemInfo[]>(
            "https://kenkoooo.com/atcoder/resources/problems.json",
            { label: "AtCoder problems.json" }
        );
        const map = new Map<string, AtcoderProblemInfo>();
        for (const p of list) {
            map.set(p.id, p);
        }
        console.log(`[problemMeta] Cached ${map.size} AtCoder problems`);
        return map;
    });
}

async function getAtcoderModels(): Promise<Record<string, { difficulty?: number }>> {
    return cached("atc-models", CATALOG_TTL_MS, async () => {
        console.log("[problemMeta] Loading AtCoder problem-models...");
        return fetchJson<Record<string, { difficulty?: number }>>(
            "https://kenkoooo.com/atcoder/resources/problem-models.json",
            { label: "AtCoder problem-models.json" }
        );
    });
}

/**
 * AtCoder does not publish difficulty; kenkoooo estimates it on a Codeforces-like
 * scale. Map that estimate to our difficulty labels.
 */
function atcoderDifficultyLabel(estimate: number | undefined): { label: string; rating: number | null } {
    if (estimate == null) {
        return { label: "unknown", rating: null };
    }
    const rating = Math.round(estimate);
    if (rating <= 400) return { label: "easy", rating };
    if (rating <= 800) return { label: "medium", rating };
    if (rating <= 1200) return { label: "hard", rating };
    return { label: "very hard", rating };
}

async function fetchAtcoderMeta(
    parsed: Extract<ParsedProblem, { platform: "atcoder" }>
): Promise<ProblemEntry> {
    const [problems, models] = await Promise.all([getAtcoderProblems(), getAtcoderModels()]);

    const info = problems.get(parsed.taskId);
    if (!info) {
        throw new Error(`AtCoder problem "${parsed.taskId}" not found.`);
    }

    const { label, rating } = atcoderDifficultyLabel(models[parsed.taskId]?.difficulty);

    // kenkoooo titles are prefixed with the display index (e.g. "A. Foo");
    // strip it for a clean problem name.
    const rawTitle = info.title || info.name || parsed.taskId;
    const title = rawTitle.replace(/^[A-Za-z0-9]+\.\s*/, "") || parsed.taskId;

    return {
        problem_id: parsed.problem_id,
        platform: "atcoder",
        title,
        difficulty: label,
        rating,
        // AtCoder exposes no topic tags.
        tags: [],
    };
}
