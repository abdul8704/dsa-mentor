import PlatformStatsClient from "./PlatformStatsClient";
import type { PlatformStat } from "@/app/lib/types/analytics";

interface PlatformStatsProps {
  data?: PlatformStat[] | null;
}

export default function PlatformStats({ data }: PlatformStatsProps) {
  return <PlatformStatsClient data={data} />;
}
