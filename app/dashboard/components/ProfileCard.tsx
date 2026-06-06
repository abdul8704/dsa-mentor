import ProfileCardClient from "./ProfileCardClient";
import type { UserProfile, StreakData } from "@/app/lib/types/analytics";


interface ProfileCardProps {
  profile?: UserProfile | null;
  streak?: StreakData | null;
}

export default function ProfileCard({ profile, streak }: ProfileCardProps) {
  return <ProfileCardClient profile={profile} streak={streak} />;
}
