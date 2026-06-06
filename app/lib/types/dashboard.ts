export interface UserProfileStreak {
    current: number;
}

export interface UserProfileSolvedToday {
    count: number;
}

/** Raw row shape returned from the getUserStreak query */
export interface UserStreakRow {
    currStreak: number;
    longestStreak: number;
    updatedOn: string | null;
}

/** Processed streak data returned from the dashboard service */
export interface DashboardStreakData {
    currentStreak: number;
    longestStreak: number;
    solvedToday: number;
    isStreakActive: boolean;
    lastActiveDate: string | null;
}