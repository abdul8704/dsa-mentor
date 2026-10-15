import ProfileCardClient from "./ProfileCardClient";
import type { UserProfile, StreakData } from "@/app/lib/types/analytics";


interface ProfileCardProps {
  profile?: UserProfile | null;
  streak?: StreakData | null;
  userId?: string;
  /** Public page: no refresh button, and no placeholder stats when streak is hidden. */
  readOnly?: boolean;
  allTimeSolved?: number;
  platforms?: string[];
}

export default function ProfileCard(props: ProfileCardProps) {
  return <ProfileCardClient {...props} />;
}
