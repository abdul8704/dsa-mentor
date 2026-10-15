import ProfileCardClient from "./ProfileCardClient";
import type { UserProfile, StreakData } from "@/app/lib/types/analytics";


interface ProfileCardProps {
  profile?: UserProfile | null;
  streak?: StreakData | null;
  userId?: string;
  /** Public page: no refresh button, and no placeholder stats when streak is hidden. */
  readOnly?: boolean;
}

export default function ProfileCard({ profile, streak, userId, readOnly }: ProfileCardProps) {
  return <ProfileCardClient profile={profile} streak={streak} userId={userId} readOnly={readOnly} />;
}
