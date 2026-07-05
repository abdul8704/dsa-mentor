"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import type { UserProfile, StreakData } from "@/app/lib/types/analytics";

interface ProfileCardProps {
  profile?: UserProfile | null;
  streak?: StreakData | null;
  userId: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Alex Rivera",
  title: "Senior Software Engineer & Algorithm Specialist",
  avatarUrl: "/placeholder-avatar.png",
  level: 7,
};

const DEFAULT_STREAK: Pick<StreakData, "currentStreak" | "solvedToday"> = {
  currentStreak: 124,
  solvedToday: 14,
};

export default function ProfileCardClient({ profile, streak, userId }: ProfileCardProps) {
  const p = profile ?? DEFAULT_PROFILE;
  const s = streak ?? DEFAULT_STREAK;
  const router = useRouter();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  async function handleRefreshAll() {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setRefreshMessage(null);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/refresh/user`,
        { user_id: userId },
        { timeout: 120_000 }
      );

      setRefreshMessage(
        res.status === 200 ? "All platforms refreshed successfully." : "Refresh completed with some issues."
      );
      router.refresh();
    } catch {
      setRefreshMessage("Could not refresh platforms right now. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="glass-card rounded-xl p-6 lg:p-8 flex flex-col sm:flex-row items-center gap-6 lg:gap-8 group">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="absolute -inset-1 bg-gradient-to-tr from-[#ffb59d] to-transparent rounded-full blur opacity-25 group-hover:opacity-50 transition-opacity" />
        <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-full border-2 border-[rgba(255,181,157,0.4)] p-1 bg-[#353437] flex items-center justify-center overflow-hidden">
          {p.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external S3 URL, avoids next/image domain config for a small avatar
            <img src={p.avatarUrl} alt={p.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-3xl lg:text-4xl font-bold text-[#ffb59d]">
              {p.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 bg-[#ffb59d] text-[#5d1800] font-bold px-2 py-0.5 rounded text-[10px] tracking-tighter">
          L{p.level}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 text-center sm:text-left">
        <h2 className="text-[24px] lg:text-[32px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-sans)" }}>
          {p.name}
        </h2>
        <p className="text-[#dfc0b6] text-[16px] opacity-80 mt-1">
          {p.title}
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          <div className="bg-white/5 rounded-lg px-4 py-3 flex flex-col">
            <span className="text-[12px] tracking-[0.05em] font-medium uppercase text-[#dfc0b6]" style={{ fontFamily: "var(--font-geist-mono)" }}>
              Current Streak
            </span>
            <span className="text-[24px] lg:text-[32px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#ffb59d]" style={{ fontFamily: "var(--font-geist-sans)" }}>
              {s.currentStreak} Days
            </span>
          </div>
          <div className="bg-white/5 rounded-lg px-4 py-3 flex flex-col">
            <span className="text-[12px] tracking-[0.05em] font-medium uppercase text-[#dfc0b6]" style={{ fontFamily: "var(--font-geist-mono)" }}>
              Solved Today
            </span>
            <span className="text-[24px] lg:text-[32px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#4edea3]" style={{ fontFamily: "var(--font-geist-sans)" }}>
              {s.solvedToday}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRefreshAll()}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[14px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? "animate-spin" : ""}`}>
              refresh
            </span>
            <span>{isRefreshing ? "Refreshing platforms…" : "Refresh all platforms"}</span>
          </button>
          {refreshMessage && (
            <span className="text-[12px] text-[#dfc0b6] opacity-80">{refreshMessage}</span>
          )}
        </div>
      </div>
    </div>
  );
}
