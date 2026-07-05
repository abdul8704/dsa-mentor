// ─── Mentorship domain types ────────────────────────────────────────────────
// Shared shapes passed between mentorship/assignment server actions and the
// mentor/mentee UI. They mirror the Supabase tables but are trimmed for the UI.

export type MentorshipStatus = "active" | "paused" | "ended";
export type InviteStatus = "pending" | "accepted" | "declined" | "expired";
export type AssignmentStatus = "pending" | "completed";
export type CompletedVia = "auto" | "manual" | null;

/** A user surfaced by the mentor's search box. No email is exposed to the client. */
export interface UserSearchResult {
    userId: string;
    name: string;
    /** e.g. { leetcode: "handle", codeforces: "handle" } */
    handles: Record<string, string>;
    /** True if there is already an active mentorship with the searching mentor. */
    alreadyConnected: boolean;
    /** True if there is already a pending invite from the searching mentor. */
    invitePending: boolean;
}

/** A row in the mentor's mentee roster, enriched with quick stats. */
export interface MenteeSummary {
    userId: string;
    name: string;
    currentStreak: number;
    longestStreak: number;
    /** All-time solved problem count. */
    totalSolved: number;
    /** Problems solved today (used as the "+N" subtext next to totalSolved). */
    solvedToday: number;
    last7DaysSolved: number;
    /** Per-day solved count for the last 7 days (index 0 = 7 days ago, index 6 = today). Same shape as the dashboard chart. */
    last7DaysBreakdown: number[];
    /** Contests attended in the last 7 days. */
    contestsThisWeek: number;
    /** Denominator shown alongside contestsThisWeek (mirrors the dashboard's weekly target). */
    contestsTotal: number;
    /** Up to 3 most-frequent problem tags among problems solved in the last 7 days. */
    topTags: string[];
    /** ISO date (YYYY-MM-DD) of the most recent solve, or null if none. */
    lastActiveDate: string | null;
    /** Days since last solve; null when the mentee has never solved anything. */
    daysSinceActive: number | null;
    /** True when the mentee hasn't solved anything in >= INACTIVE_THRESHOLD days. */
    isInactive: boolean;
    totalAssignments: number;
    completedAssignments: number;
    /** 0–100 completion rate; 0 when no assignments. */
    completionRate: number;
    pendingAssignments: number;
}

/** A mentor-defined group of mentees, used to batch-assign tasks and notes. Mentees are never aware they belong to one. */
export interface MenteeGroup {
    id: string;
    name: string;
    memberCount: number;
    createdAt: string;
}

/** Full membership detail for a group, used by the manage/edit UI. */
export interface MenteeGroupDetail {
    id: string;
    name: string;
    memberIds: string[];
}

/** A note sent by a mentor, as seen by the mentor (includes the recipient). */
export interface SentNote {
    id: string;
    menteeId: string;
    menteeName: string;
    body: string;
    createdAt: string;
}

/** A note as seen by the mentee it was sent to. Never reveals group context. */
export interface MenteeNote {
    id: string;
    mentorName: string;
    body: string;
    createdAt: string;
}

/**
 * Mentor-only rollup of a mentee's assigned-task performance. "Completed" is
 * verified against the mentee's actual solved-problems history rather than
 * the assignment's `status` field, so a manually-marked-but-unsolved task
 * doesn't count as solved.
 */
export interface AssignmentInsights {
    totalAssigned: number;
    completedVerified: number;
    unsolved: number;
    /** Problems solved (overall) in the last 7 days, divided by 7. */
    avgSolvedPerDay: number;
}

/** A pending invite shown to the invited user. */
export interface PendingInvite {
    token: string;
    mentorName: string;
    createdAt: string;
    expiresAt: string;
}

/** An invite row shown to the mentor who sent it. */
export interface SentInvite {
    id: string;
    inviteeEmail: string;
    status: InviteStatus;
    createdAt: string;
    expiresAt: string;
}

/** An assignment as seen by a mentor (for a specific mentee). */
export interface AssignmentView {
    id: string;
    platform: string;
    problemId: string;
    title: string;
    url: string | null;
    note: string | null;
    dueDate: string | null;
    status: AssignmentStatus;
    assignedAt: string;
    completedAt: string | null;
    completedVia: CompletedVia;
}

/** A task as seen by a mentee (includes who assigned it). */
export interface TaskView extends AssignmentView {
    mentorName: string;
    difficulty: string | null;
}

/** Generic action result used by mutation server actions. */
export interface ActionResult {
    success: boolean;
    message: string;
}

/** Result of sending an invite, including the shareable accept link. */
export interface InviteResult extends ActionResult {
    /** Absolute accept URL, so the mentor can copy/share it directly. */
    inviteUrl?: string;
}
