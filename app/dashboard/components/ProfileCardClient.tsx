"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import type { UserProfile, StreakData } from "@/app/lib/types/analytics";
import { PlatformLogo, platformMeta } from "./ui/platforms";
import { ripple, spotlight } from "./ui/interaction";

interface ProfileCardProps {
  profile?: UserProfile | null;
  streak?: StreakData | null;
  userId?: string;
  /** Public page: no refresh button, and no placeholder stats when streak is hidden. */
  readOnly?: boolean;
  /** All-time solved across platforms (difficulty.all.total). Hidden when undefined. */
  allTimeSolved?: number;
  /** Platforms the user has data on, shown as logos. */
  platforms?: string[];
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Alex Rivera",
  title: "Senior Software Engineer & Algorithm Specialist",
  avatarUrl: "/placeholder-avatar.png",
  level: 7,
};

/**
 * Identity strip across the top of the dashboard: avatar, name, level, title,
 * all-time solved, connected platforms, and "Refresh all platforms".
 * Streak and today's count live in the KPI tiles right below it.
 */
export default function ProfileCardClient({ profile, userId, readOnly = false, allTimeSolved, platforms = [] }: ProfileCardProps) {
  const p = profile ?? DEFAULT_PROFILE;
  const router = useRouter();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  async function handleRefreshAll() {
    if (isRefreshing || !userId) {
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
    <section
      className="dash-card dash-hero dash-spot !flex-row flex-wrap items-center !gap-x-6 !gap-y-4"
      onPointerMove={spotlight}
      aria-label="Profile"
    >
      {/* Avatar with gradient ring */}
      <div className="relative flex-none group">
        <div
          className="w-16 h-16 rounded-full p-[2px] transition-transform duration-[var(--dash-dur-base)] ease-[var(--dash-ease)] group-hover:rotate-6 group-hover:scale-105"
          style={{ background: "var(--dash-grad-accent)" }}
        >
          <div className="w-full h-full rounded-full overflow-hidden grid place-items-center bg-[color:var(--dash-surface-sunken)]">
            {p.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external S3 URL, avoids next/image domain config for a small avatar
              <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-extrabold text-[color:var(--dash-accent-soft)]">{p.name.charAt(0)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-[1] flex-1 min-w-[180px]">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-[color:var(--dash-content-primary)]">{p.name}</h2>
          <span
            className="dash-num text-[11px] font-semibold px-2 py-0.5 rounded-full text-[color:var(--dash-content-on-accent)]"
            style={{ background: "var(--dash-grad-accent)" }}
            title={`Level ${p.level}`}
          >
            L{p.level}
          </span>
        </div>
        <p className="text-sm text-[color:var(--dash-content-secondary)] mt-0.5">{p.title}</p>
      </div>

      <div className="relative z-[1] flex flex-wrap items-center gap-x-8 gap-y-3">
        {allTimeSolved !== undefined && (
          <div>
            <div className="dash-label">All-time solved</div>
            <div className="dash-num text-xl font-semibold text-[color:var(--dash-content-primary)]">
              {allTimeSolved.toLocaleString()}
            </div>
          </div>
        )}
        {platforms.length > 0 && (
          <div>
            <div className="dash-label">Platforms</div>
            <ul className="flex items-center gap-2 mt-1.5" aria-label={platforms.map((k) => platformMeta(k).name).join(", ")}>
              {platforms.map((k) => (
                <li
                  key={k}
                  title={platformMeta(k).name}
                  className="w-8 h-8 grid place-items-center rounded-[var(--dash-r-sm)] bg-[color:var(--dash-surface-sunken)] border border-[color:var(--dash-border-subtle)] transition-transform duration-[var(--dash-dur-fast)] hover:-translate-y-0.5 hover:border-[color:var(--dash-accent-line)]"
                >
                  <PlatformLogo platform={k} size={18} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {!readOnly && (
          <div className="flex flex-col items-start gap-1.5">
            <button
              type="button"
              onClick={() => void handleRefreshAll()}
              onPointerDown={ripple}
              disabled={isRefreshing}
              aria-busy={isRefreshing}
              className="dash-btn dash-btn-primary min-w-[196px]"
            >
              <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true">
                refresh
              </span>
              <span>{isRefreshing ? "Refreshing platforms…" : "Refresh all platforms"}</span>
            </button>
            {refreshMessage && (
              <span role="status" className="text-xs text-[color:var(--dash-content-secondary)]">
                {refreshMessage}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
