export type GoalKind = "solve" | "revise";
export type GoalRecurrence = "none" | "weekly" | "monthly";

/**
 * Where a goal stands right now, for ordering and highlighting:
 * overdue (past due, not met) → due-soon (≤ 3 days left) → active →
 * upcoming (not started) → completed.
 */
export type GoalStatus = "overdue" | "due-soon" | "active" | "upcoming" | "completed";

/** A problem that counted toward a goal (solve goals) or is part of it (revision goals). */
export interface GoalProblemView {
    problemId: string;
    title: string;
    platform: string;
    url: string | null;
    /** YYYY-MM-DD the solve that counted happened on; null if not (yet) counted. */
    solvedDate: string | null;
    /** Revision goals: done, either by a re-solve in the window or marked manually. */
    revised?: boolean;
    revisedVia?: "auto" | "manual" | null;
}

/** Result of one earlier period of a repeating goal. */
export interface GoalPeriodResult {
    start: string;
    end: string;
    progress: number;
    met: boolean;
}

export interface GoalView {
    id: string;
    userId: string;
    name: string;
    kind: GoalKind;
    recurrence: GoalRecurrence;
    /** The goal's own dates as stored (end is "repeat until" for repeating goals). */
    startDate: string;
    endDate: string | null;
    /** The window progress is measured over now (the current period for repeating goals). */
    periodStart: string;
    periodEnd: string;
    targetCount: number;
    progress: number;
    /** null = all platforms */
    platforms: string[] | null;
    includeAlreadySolved: boolean;
    status: GoalStatus;
    daysLeft: number;
    /** Solve goals: problems that counted this period. Revision goals: every problem in the goal. */
    problems: GoalProblemView[];
    /** Repeating goals only: up to the last 6 finished periods, newest first. */
    history: GoalPeriodResult[];
    createdByName: string | null;
    createdByMe: boolean;
}

/** One already-solved problem offered in the revision-goal picker. */
export interface RevisionCandidate {
    problemId: string;
    title: string;
    platform: string;
    difficulty: string | null;
    /** Most recent date it was solved. */
    lastSolvedDate: string;
}

/** Someone whose goals the current user can view and manage. */
export interface GoalOwnerOption {
    userId: string;
    name: string;
    isMe: boolean;
}

export interface GoalInput {
    name: string;
    kind: GoalKind;
    startDate: string;
    endDate: string | null;
    recurrence: GoalRecurrence;
    targetCount: number | null;
    platforms: string[] | null;
    includeAlreadySolved: boolean;
    /** Revision goals: the problems to revise. */
    problemIds: string[];
}
