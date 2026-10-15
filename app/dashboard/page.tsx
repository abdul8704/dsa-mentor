import { createSupabaseServerClient } from "../lib/supabase/server-client";
import { isOnboardingCompleted } from "../lib/auth/onboarding";
import { redirect } from "next/navigation";
import { getDashboardData } from "../actions/analytics.actions";
import { getUpcomingContests, getRecentContestsWithAttendance } from "../actions/contest.actions";
import type { DashboardData, UpcomingContest, RecentContestsResult } from "../lib/types/analytics";

import DashboardView from "./components/DashboardView";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  if (!(await isOnboardingCompleted(user.id))) {
    redirect("/onboarding");
  }

  // Fetch dashboard data and the (public, platform-wide) upcoming contest
  // schedule in parallel — the latter doesn't depend on the user's data.
  const [data, upcomingContests, recentContests]: [DashboardData, UpcomingContest[], RecentContestsResult] =
    await Promise.all([
      getDashboardData(user.id),
      getUpcomingContests(),
      getRecentContestsWithAttendance(user.id),
    ]);

  return (
    <DashboardView
      data={data}
      recentContests={recentContests}
      upcomingContests={upcomingContests}
      userId={user.id}
    />
  );
}
