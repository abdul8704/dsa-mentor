import StreakStatsClient from "./StreakStatsClient";
import type { StreakData } from "@/app/lib/types/analytics";

interface StreakStatsCardProps {
  streak?: StreakData | null;
  /** Contests the user attended in the last 7 days (matched against real schedule). */
  contestsAttended?: number;
  /** Total contests held across all platforms in the last 7 days. */
  contestsTotal?: number;
}

export default function StreakStatsCard({ streak, contestsAttended, contestsTotal }: StreakStatsCardProps) {
  return (
    <StreakStatsClient
      streak={streak}
      contestsAttended={contestsAttended}
      contestsTotal={contestsTotal}
    />
  );
}
