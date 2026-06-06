import { createSupabaseServerClient } from "../supabase/server-client";
import { UserProfileSolvedToday, UserProfileStreak, UserStreakRow } from "../types/dashboard";

export async function getSolvedToday(userId: string): Promise<UserProfileSolvedToday> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
                                        .from("user-streak")
                                        .select("solved_today")
                                        .eq("user_id", userId)
                                        .single();

    if (error) {
        console.error("Error fetching solved today:", error);
        return { count: 0 }; // Default to 0 on error
    }

    return { count: data.solved_today };
}

export async function getUserStreak(userId: string): Promise<UserStreakRow> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
                                        .from("user-streak")
                                        .select("curr_streak, longest_streak, updated_on")
                                        .eq("user_id", userId)
                                        .single();

    if (error) {
        console.error("Error fetching user streak:", error);
        return {
            currStreak: 0,
            longestStreak: 0,
            updatedOn: null,
        };
    }

    return {
        currStreak: data.curr_streak ?? 0,
        longestStreak: data.longest_streak ?? 0,
        updatedOn: data.updated_on,
    };
}