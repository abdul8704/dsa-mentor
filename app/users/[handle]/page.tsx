import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { getCached, setCached } from "@/app/lib/redis/client";
import * as queries from "@/app/lib/analytics/queries";
import { getRecentContestsWithAttendance, getUpcomingContests } from "@/app/lib/contests/schedule";
import { resolvePublicProfile } from "@/app/lib/public-api/profile";
import { DATA_CACHE_SECONDS } from "@/app/lib/public-api/data";
import { normalizeHandle, type PublicWidget } from "@/app/lib/public-api/widgets";
import type { DashboardData, RecentContestsResult } from "@/app/lib/types/analytics";

import ProfileCard from "@/app/dashboard/components/ProfileCard";
import StreakStatsCard from "@/app/dashboard/components/StreakStatsCard";
import RecentProblemsTable from "@/app/dashboard/components/RecentProblemsTable";
import Heatmap from "@/app/dashboard/components/Heatmap";
import StatsOverview from "@/app/dashboard/components/StatsOverview";
import ContestRatingGraph from "@/app/dashboard/components/ContestRatingGraph";
import TopicDonut from "@/app/dashboard/components/TopicDonut";
import TopicProgressBars from "@/app/dashboard/components/TopicProgressBars";
import UpcomingContests from "@/app/dashboard/components/UpcomingContests";
import RecentContests from "@/app/dashboard/components/RecentContests";
import BackgroundEffects from "@/app/dashboard/components/BackgroundEffects";

/**
 * /users/<handle> — a read-only copy of someone's dashboard that anyone can
 * open. Gated by the same opt-in as the public API (Settings → Public profile):
 * a handle that's disabled or doesn't exist is a plain 404, and only the
 * widgets the user chose to share are rendered (and sent to the browser).
 *
 * Reads with the service-role client, which is safe only because
 * resolvePublicProfile has checked the opt-in first. The data is cached under
 * the user's public cache prefix, so saving Settings purges it immediately.
 */

interface PublicDashboard {
  data: DashboardData;
  recentContests: RecentContestsResult;
}

const getProfile = cache(async (rawHandle: string) => resolvePublicProfile(normalizeHandle(decodeURIComponent(rawHandle))));

async function loadDashboard(userId: string): Promise<PublicDashboard> {
  const key = `public:v1:data:${userId}:page`;
  const cached = await getCached<PublicDashboard>(key);
  if (cached) return cached;

  const db = getServiceRoleClient();
  const [data, recentContests] = await Promise.all([
    queries.getDashboardData(db, userId),
    getRecentContestsWithAttendance(db, userId),
  ]);
  const result = { data, recentContests };
  await setCached(key, result, DATA_CACHE_SECONDS);
  return result;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const profile = await getProfile((await params).handle).catch(() => null);
  if (!profile) return { title: "Profile not found | AlgoMentor" };
  return {
    title: `@${profile.handle} | AlgoMentor`,
    description: `@${profile.handle}'s competitive programming progress on AlgoMentor: streaks, solved problems, contest ratings and more.`,
  };
}

export default async function PublicDashboardPage({ params }: { params: Promise<{ handle: string }> }) {
  const profile = await getProfile((await params).handle);
  if (!profile) notFound();

  const shows = (w: PublicWidget) => profile.widgets.includes(w);
  const [{ data, recentContests }, upcomingContests] = await Promise.all([
    loadDashboard(profile.userId),
    shows("contests") ? getUpcomingContests() : Promise.resolve([]),
  ]);

  // Without the "profile" widget, the card still shows the handle, never the real name or avatar.
  const shownProfile = shows("profile")
    ? { ...data.profile, title: `@${profile.handle}` }
    : { name: `@${profile.handle}`, title: "AlgoMentor member", avatarUrl: "", level: data.profile.level };
  const streak = shows("streak") ? data.streak : null;

  const middle = [
    shows("stats") && <StatsOverview key="stats" difficulty={data.difficulty} platforms={data.platforms} />,
    shows("contest-rating") && <ContestRatingGraph key="rating" data={data.contestRating} />,
  ].filter(Boolean);

  return (
    <div className="dashboard-shell">
      <header className="px-4 lg:px-10 pt-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-[#e5e1e4] hover:text-[#ffb59d] transition-colors">
            <span className="material-symbols-outlined text-[#ffb59d]">terminal</span>
            <span className="font-semibold tracking-tight" style={{ fontFamily: "var(--font-geist-sans)" }}>
              AlgoMentor
            </span>
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center gap-1 py-2 px-4 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[14px] font-semibold hover:bg-[rgba(255,181,157,0.08)] transition-all"
          >
            Track your own progress
          </Link>
        </div>
      </header>

      <main className="pt-6 pb-12 px-4 lg:px-10 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className={`grid grid-cols-1 ${streak ? "lg:grid-cols-2" : ""} gap-6`}>
            <div>
              <ProfileCard profile={shownProfile} streak={streak} readOnly />
            </div>
            {streak && (
              <div>
                <StreakStatsCard
                  streak={streak}
                  contestsAttended={shows("contests") ? recentContests.attendedCount : undefined}
                  contestsTotal={shows("contests") ? recentContests.total : undefined}
                />
              </div>
            )}
          </div>

          {shows("recent-problems") && <RecentProblemsTable data={data.recentProblems} viewAllHref={null} />}

          {shows("heatmap") && <Heatmap data={data.heatmap} />}

          {middle.length > 0 && (
            <div className={`grid grid-cols-1 ${middle.length === 2 ? "lg:grid-cols-2" : ""} gap-6`}>{middle}</div>
          )}

          {shows("topics") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6">
                <TopicDonut data={data.topics} />
              </div>
              <div className="lg:col-span-6">
                <TopicProgressBars data={data.topics.last7Days} />
              </div>
            </div>
          )}

          {shows("contests") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentContests
                contests={recentContests.contests}
                attendedCount={recentContests.attendedCount}
                total={recentContests.total}
              />
              <UpcomingContests contests={upcomingContests} />
            </div>
          )}

          <p className="text-center text-[12px] text-[#a78b82]">
            Public profile on AlgoMentor · updates every few minutes
          </p>
        </div>
      </main>
      <BackgroundEffects />
    </div>
  );
}
