import type { ReactNode } from "react";
import type { DashboardData, RecentContestsResult, UpcomingContest } from "@/app/lib/types/analytics";
import type { PublicWidget } from "@/app/lib/public-api/widgets";
import ProfileCard from "./ProfileCard";
import StreakStatsCard from "./StreakStatsCard";
import Last7DaysCard from "./Last7DaysCard";
import DifficultyByPlatform from "./DifficultyByPlatform";
import PlatformRatings from "./PlatformRatings";
import Heatmap from "./Heatmap";
import ContestRatingGraph from "./ContestRatingGraph";
import TopicsCard from "./TopicsCard";
import ContestsCard from "./ContestsCard";
import RecentProblemsTable from "./RecentProblemsTable";
import { PLATFORM_ORDER } from "./ui/platforms";

interface DashboardViewProps {
  data: DashboardData;
  recentContests: RecentContestsResult;
  upcomingContests: UpcomingContest[];
  /** Enables "Refresh all platforms" for this user. */
  userId?: string;
  readOnly?: boolean;
  /** Which widgets to render (public profiles); everything when omitted. */
  shows?: (w: PublicWidget) => boolean;
  /** Overrides the profile shown in the strip (public profiles). */
  profile?: DashboardData["profile"];
  viewAllHref?: string | null;
}

/** Two cards side by side on wide screens; one alone takes the full row. */
function Pair({ left, right, split }: { left: ReactNode; right: ReactNode; split: [string, string] }) {
  if (!left && !right) return null;
  if (!left || !right) return <div className="xl:col-span-12 flex flex-col">{left || right}</div>;
  return (
    <>
      <div className={`${split[0]} flex flex-col [&>*]:flex-1`}>{left}</div>
      <div className={`${split[1]} flex flex-col [&>*]:flex-1`}>{right}</div>
    </>
  );
}

/**
 * The dashboard body, shared by the user's own dashboard, a mentor's view of
 * a mentee, and public profiles, so all three always render the same thing.
 */
export default function DashboardView({
  data,
  recentContests,
  upcomingContests,
  userId,
  readOnly = false,
  shows = () => true,
  profile,
  viewAllHref,
}: DashboardViewProps) {
  const platforms = Object.keys(data.difficulty)
    .filter((k) => k !== "all")
    .sort((a, b) => ((PLATFORM_ORDER.indexOf(a as never) + 100) % 100) - ((PLATFORM_ORDER.indexOf(b as never) + 100) % 100));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-12">
        <ProfileCard
          profile={profile ?? data.profile}
          streak={shows("streak") ? data.streak : null}
          userId={userId}
          readOnly={readOnly}
          allTimeSolved={shows("stats") ? data.difficulty.all?.total ?? 0 : undefined}
          platforms={shows("stats") ? platforms : []}
        />
      </div>

      {shows("streak") && (
        <div className="xl:col-span-12">
          <StreakStatsCard
            streak={data.streak}
            contestsAttended={shows("contests") ? recentContests.attendedCount : undefined}
            contestsTotal={shows("contests") ? recentContests.total : undefined}
            contests={shows("contests") ? recentContests.contests : undefined}
          />
        </div>
      )}

      <Pair
        split={["xl:col-span-5", "xl:col-span-7"]}
        left={shows("streak") && <Last7DaysCard streak={data.streak} />}
        right={shows("stats") && <DifficultyByPlatform difficulty={data.difficulty} />}
      />

      {shows("heatmap") && (
        <div className="xl:col-span-12">
          <Heatmap data={data.heatmap} />
        </div>
      )}

      <Pair
        split={["xl:col-span-8", "xl:col-span-4"]}
        left={shows("contest-rating") && <ContestRatingGraph data={data.contestRating} />}
        right={shows("stats") && <PlatformRatings platforms={data.platforms} />}
      />

      <Pair
        split={["xl:col-span-7", "xl:col-span-5"]}
        left={shows("topics") && <TopicsCard data={data.topics} />}
        right={
          shows("contests") && (
            <ContestsCard
              upcoming={upcomingContests}
              recent={recentContests.contests}
              attendedCount={recentContests.attendedCount}
              total={recentContests.total}
            />
          )
        }
      />

      {shows("recent-problems") && (
        <div className="xl:col-span-12">
          <RecentProblemsTable data={data.recentProblems} viewAllHref={viewAllHref} />
        </div>
      )}
    </div>
  );
}
