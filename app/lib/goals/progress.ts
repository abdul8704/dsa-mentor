import type { GoalRecurrence, GoalStatus } from "@/app/lib/types/goals";

/**
 * Pure goal-progress logic: periods, counting and status. No I/O, so the
 * rules live in one place (app/actions/goals.actions.ts does the fetching).
 *
 * All dates are YYYY-MM-DD in UTC, the same calendar the rest of the
 * dashboard (streaks, heatmap, solved_date) uses.
 */

export const DUE_SOON_DAYS = 3;

export interface SolveRow {
    problem_id: string;
    platform: string;
    solved_date: string;
    already_solved: boolean;
}

export interface Window {
    start: string;
    end: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const toMs = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const fromMs = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const utcToday = (): string => new Date().toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => fromMs(toMs(iso) + n * DAY_MS);
export const daysBetween = (from: string, to: string): number => Math.round((toMs(to) - toMs(from)) / DAY_MS);

/** `iso` plus n months, clamped to the end of the month (Jan 31 + 1 → Feb 28/29). */
export const addMonths = (iso: string, n: number): string => {
    const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
    const target = new Date(Date.UTC(y, m - 1 + n, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d, lastDay));
    return fromMs(target.getTime());
};

interface GoalDates {
    start_date: string;
    end_date: string | null;
    recurrence: GoalRecurrence;
}

/** Window of period `k` (0-based) of a goal; one-off goals only have period 0. */
export const periodAt = (goal: GoalDates, k: number): Window => {
    if (goal.recurrence === "none") {
        return { start: goal.start_date, end: goal.end_date ?? goal.start_date };
    }
    const start = goal.recurrence === "weekly" ? addDays(goal.start_date, 7 * k) : addMonths(goal.start_date, k);
    const next = goal.recurrence === "weekly" ? addDays(goal.start_date, 7 * (k + 1)) : addMonths(goal.start_date, k + 1);
    let end = addDays(next, -1);
    // "Repeat until" cuts the final period short.
    if (goal.end_date && end > goal.end_date) end = goal.end_date;
    return { start, end };
};

/**
 * Index of the period that applies today: the one containing today, the first
 * one if the goal hasn't started, or the last one if it repeated until a date
 * that has passed.
 */
export const currentPeriodIndex = (goal: GoalDates, today: string): number => {
    if (goal.recurrence === "none" || today <= goal.start_date) return 0;

    const effective = goal.end_date && today > goal.end_date ? goal.end_date : today;
    let k: number;
    if (goal.recurrence === "weekly") {
        k = Math.floor(daysBetween(goal.start_date, effective) / 7);
    } else {
        const [sy, sm] = goal.start_date.split("-").map(Number) as [number, number];
        const [ey, em] = effective.split("-").map(Number) as [number, number];
        k = (ey - sy) * 12 + (em - sm);
        if (addMonths(goal.start_date, k) > effective) k--;
    }
    return Math.max(0, k);
};

/**
 * Distinct problems that count toward a solve goal within `window`: solves
 * on one of `platforms` (null = any), and — unless `includeAlreadySolved` —
 * only first-ever solves. Returns problem_id → date of the counting solve.
 */
export const countSolves = (
    rows: SolveRow[],
    window: Window,
    platforms: string[] | null,
    includeAlreadySolved: boolean
): Map<string, string> => {
    const counted = new Map<string, string>();
    for (const r of rows) {
        if (r.solved_date < window.start || r.solved_date > window.end) continue;
        if (platforms && platforms.length > 0 && !platforms.includes(r.platform)) continue;
        if (!includeAlreadySolved && r.already_solved) continue;
        const prev = counted.get(r.problem_id);
        if (!prev || r.solved_date < prev) counted.set(r.problem_id, r.solved_date);
    }
    return counted;
};

/**
 * Date a problem was re-solved within `window` (a solve of an already-solved
 * problem), or null.
 */
export const revisedOn = (rows: SolveRow[], problemId: string, window: Window): string | null => {
    let best: string | null = null;
    for (const r of rows) {
        if (r.problem_id !== problemId || !r.already_solved) continue;
        if (r.solved_date < window.start || r.solved_date > window.end) continue;
        if (!best || r.solved_date < best) best = r.solved_date;
    }
    return best;
};

export const goalStatus = (window: Window, progress: number, target: number, today: string): GoalStatus => {
    if (progress >= target) return "completed";
    if (today < window.start) return "upcoming";
    if (today > window.end) return "overdue";
    if (daysBetween(today, window.end) <= DUE_SOON_DAYS) return "due-soon";
    return "active";
};

/**
 * Display order: overdue (unmet past their due date) first, then everything
 * still open by due date, then completed goals (most recent first).
 */
export const compareGoals = (
    a: { status: GoalStatus; periodEnd: string },
    b: { status: GoalStatus; periodEnd: string }
): number => {
    const rank = (s: GoalStatus) => (s === "overdue" ? 0 : s === "completed" ? 2 : 1);
    const byRank = rank(a.status) - rank(b.status);
    if (byRank !== 0) return byRank;
    if (a.status === "completed") return b.periodEnd.localeCompare(a.periodEnd);
    return a.periodEnd.localeCompare(b.periodEnd);
};
