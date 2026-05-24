import StreakStatsClient from "./StreakStatsClient";
import type { StreakData } from "@/app/lib/types/analytics";

interface StreakStatsCardProps {
  streak?: StreakData | null;
}

export default function StreakStatsCard({ streak }: StreakStatsCardProps) {
  return <StreakStatsClient streak={streak} />;
}
