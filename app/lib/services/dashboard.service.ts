import { getSolvedToday, getUserStreak } from "../queries/dashboard";
import { DashboardStreakData } from "../types/dashboard";

/**
 * Fetches streak + solved-today data in parallel, then merges and
 * enriches them into a single DashboardStreakData object.
 */
export async function getDashboardStreakData(userId: string): Promise<DashboardStreakData> {
    const [streakRow, solvedToday] = await Promise.all([
        getUserStreak(userId),
        getSolvedToday(userId),
    ]);

    const today: string = new Date().toISOString().split("T")[0];
    const isStreakActive: boolean = streakRow.updatedOn === today;

    const dashboardStreak: DashboardStreakData = {
        currentStreak: streakRow.currStreak,
        longestStreak: streakRow.longestStreak,
        solvedToday: solvedToday.count,
        isStreakActive,
        lastActiveDate: streakRow.updatedOn,
    };

    return dashboardStreak;
}
