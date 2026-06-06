import { createSupabaseServerClient } from "../lib/supabase/server-client";
import { isOnboardingCompleted } from "../lib/auth/onboarding";
import { redirect } from "next/navigation";
import { getDashboardData } from "../actions/analytics.actions";
import type { DashboardData } from "../lib/types/analytics";

import ProfileCard from "./components/ProfileCard";
import StreakStatsCard from "./components/StreakStatsCard";
import Heatmap from "./components/Heatmap";
import StatsOverview from "./components/StatsOverview";
import ContestRatingGraph from "./components/ContestRatingGraph";
import TopicDonut from "./components/TopicDonut";
import TopicProgressBars from "./components/TopicProgressBars";

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

  // Fetch all dashboard data in a single parallel call
  const data: DashboardData = await getDashboardData(user.id);

  return (
    <div className="space-y-6">
      {/* Header Section: Profile + Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card — 50% */}
        <div>
          <ProfileCard profile={data.profile} streak={data.streak} />
        </div>

        {/* Stats 2×2 Grid — 50% */}
        <div>
          <StreakStatsCard streak={data.streak} />
        </div>
      </div>

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
    </div>
  );
}