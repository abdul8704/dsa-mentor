import { createSupabaseServerClient } from "../lib/supabase/server-client";
import { isOnboardingCompleted } from "../lib/auth/onboarding";
import { redirect } from "next/navigation";
import { getDashboardData } from "../actions/analytics.actions";
import { getUpcomingContests, getRecentContestsWithAttendance } from "../actions/contest.actions";
import type { DashboardData, UpcomingContest, RecentContestsResult } from "../lib/types/analytics";

import ProfileCard from "./components/ProfileCard";
import StreakStatsCard from "./components/StreakStatsCard";
import RecentProblemsTable from "./components/RecentProblemsTable";
import Heatmap from "./components/Heatmap";
import StatsOverview from "./components/StatsOverview";
import ContestRatingGraph from "./components/ContestRatingGraph";
import TopicDonut from "./components/TopicDonut";
import TopicProgressBars from "./components/TopicProgressBars";
import UpcomingContests from "./components/UpcomingContests";
import RecentContests from "./components/RecentContests";

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
    <div className="space-y-6">
      {/* Header Section: Profile + Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card — 50% */}
        <div>
          <ProfileCard profile={data.profile} streak={data.streak} userId={user.id} />
        </div>

        {/* Stats 2×2 Grid — 50% */}
        <div>
          <StreakStatsCard
            streak={data.streak}
            contestsAttended={recentContests.attendedCount}
            contestsTotal={recentContests.total}
          />
        </div>
      </div>

      {/* Recently Solved Problems Table */}
      <RecentProblemsTable data={data.recentProblems} />

      {/* Heatmap Section */}
      <Heatmap data={data.heatmap} />

      {/* Middle Grid: Stats Overview (50%) + Contest Rating (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatsOverview difficulty={data.difficulty} platforms={data.platforms} />
        <ContestRatingGraph data={data.contestRating} />
      </div>

      {/* Bottom Section: Topic Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <TopicDonut data={data.topics} />
        </div>
        <div className="lg:col-span-6">
          <TopicProgressBars data={data.topics.last7Days} />
        </div>
      </div>

      {/* Contests: Recent (attendance) + Upcoming — 50/50 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentContests
          contests={recentContests.contests}
          attendedCount={recentContests.attendedCount}
          total={recentContests.total}
        />
        <UpcomingContests contests={upcomingContests} />
      </div>
    </div>
  );
}