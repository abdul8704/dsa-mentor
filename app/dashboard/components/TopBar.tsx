"use client";

import type { UserProfile } from "@/app/lib/types/analytics";

interface TopBarProps {
  profile?: UserProfile | null;
}

export default function TopBar({ profile }: TopBarProps) {
  const userName = profile?.name ?? "Alex Rivera";
  const userTitle = "Lead Mentor";

  return (
    <header
      className="
        fixed top-0 right-0
        w-full lg:w-[calc(100%-280px)]
        h-16 border-b border-white/10 z-50
        flex justify-end items-center
        px-4 lg:px-10
        pl-14 lg:pl-10
      "
      style={{
        background: "rgba(19, 19, 21, 0.4)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-4 lg:gap-6">
        <button className="relative text-[#dfc0b6] hover:text-[#ffb59d] transition-colors active:scale-90">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-[#ffb59d] rounded-full" />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[12px] font-bold text-[#e5e1e4] tracking-[0.05em]" style={{ fontFamily: "var(--font-geist-mono)" }}>
              {userName}
            </p>
            <p className="text-[10px] text-[#dfc0b6] uppercase tracking-widest">
              {userTitle}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full border border-[rgba(255,181,157,0.2)] bg-[#353437] flex items-center justify-center text-[#ffb59d] font-bold text-sm">
            {userName.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}
