/**
 * CSES difficulty, derived from the whole problemset rather than per task.
 *
 * Why not the solve rate (solvedBy / attemptedBy)? CSES lets you resubmit
 * forever, and only people who already got through the earlier sections even
 * try the hard ones — so almost every task, "Weird Algorithm" and the
 * Advanced Techniques set alike, sits at a 75–95% solve rate. Bucketing on it
 * labelled nearly everything "easy".
 *
 * Instead, two signals that do track difficulty:
 *  1. The section. CSES sections follow the CPH book's progression, so each
 *     gets a curated band on a 0 (easy) .. 2 (hard) scale.
 *  2. Rank by solver count *within* that section. People work a section
 *     roughly top to bottom and drop off at the hard ones, so fewer solvers
 *     than its siblings means harder. Ranking inside the section (not
 *     comparing raw counts globally) keeps newer sections — which have fewer
 *     solvers only because they were added later — from all reading as hard.
 *
 * Output stays within easy/medium/hard, the buckets
 * the worker's scripts/refreshPlatformData.ts aggregates. Mirrors the
 * worker's utils/csesDifficulty.ts exactly -- keep the two in sync.
 */

export type CsesDifficulty = "easy" | "medium" | "hard";

export interface CsesTaskStats {
    taskId: number;
    category: string;
    solvedBy: number;
}

// [lo, hi] on 0 = easy, 1 = medium, 2 = hard. The most-solved task in a
// section lands at lo, the least-solved at hi.
const SECTION_BANDS: Record<string, [number, number]> = {
    "introductory problems": [0, 1],
    "sorting and searching": [0, 1.6],
    "dynamic programming": [0.5, 1.8],
    "graph algorithms": [0.5, 2],
    "range queries": [0.7, 2],
    "tree algorithms": [0.7, 2],
    "mathematics": [0.7, 2],
    "string algorithms": [1, 2],
    "geometry": [1, 2],
    "advanced techniques": [1.5, 2],
    "sliding window problems": [0.5, 1.8],
    "interactive problems": [1, 2],
    "bitwise operations": [1, 2],
    "construction problems": [1, 2],
    "advanced graph problems": [1.5, 2],
    "counting problems": [1.5, 2],
    "additional problems i": [1.5, 2],
    "additional problems ii": [1.5, 2],
};
// A section CSES adds later that isn't listed above.
const DEFAULT_BAND: [number, number] = [1, 2];

const bandFor = (category: string): [number, number] =>
    SECTION_BANDS[category.trim().toLowerCase()] ?? DEFAULT_BAND;

const label = (score: number): CsesDifficulty =>
    score < 0.5 ? "easy" : score < 1.5 ? "medium" : "hard";

/**
 * Classifies every task in `tasks` (pass the full problemset list, not just
 * the tasks you care about — ranks are relative to each task's section).
 * Returns taskId -> difficulty.
 */
export const buildCsesDifficultyIndex = (tasks: CsesTaskStats[]): Map<number, CsesDifficulty> => {
    const bySection = new Map<string, CsesTaskStats[]>();
    for (const t of tasks) {
        const key = t.category.trim().toLowerCase();
        const list = bySection.get(key) ?? [];
        list.push(t);
        bySection.set(key, list);
    }

    const index = new Map<number, CsesDifficulty>();
    for (const [section, list] of bySection) {
        const [lo, hi] = bandFor(section);
        const sorted = [...list].sort((a, b) => b.solvedBy - a.solvedBy);

        for (const t of sorted) {
            // Ties share the rank of the first task with that count.
            const rank = sorted.findIndex((s) => s.solvedBy === t.solvedBy);
            const p = sorted.length > 1 ? rank / (sorted.length - 1) : 0;
            index.set(t.taskId, label(lo + p * (hi - lo)));
        }
    }

    return index;
};
