"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getBrowserClient } from "@/app/lib/supabase/browser-client";
import { respondToInvite } from "@/app/actions/mentorship.actions";
import type { PendingInvite } from "@/app/lib/types/mentorship";

/** Renders a short "time ago" label (e.g. "3d ago", "2h ago") for an ISO timestamp. */
function timeAgo(isoDate: string): string {
  const diffMs: number = Date.now() - new Date(isoDate).getTime();
  const minutes: number = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours: number = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days: number = Math.floor(hours / 24);
  return `${days}d ago`;
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Mentees", icon: "group", href: "/dashboard/mentees" },
  { label: "Tasks", icon: "assignment", href: "/dashboard/tasks" },
];

const FOOTER_ITEMS = [
  { label: "Settings", icon: "settings", href: "/onboarding?edit=1" },
];

export default function Sidebar({ initialInvites }: { initialInvites: PendingInvite[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getBrowserClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [invites, setInvites] = useState<PendingInvite[]>(initialInvites);
  const [notifOpen, setNotifOpen] = useState(false);
  const [respondingToken, setRespondingToken] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<{ token: string; message: string } | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setInvites(initialInvites);
  }, [initialInvites]);

  useEffect(() => {
    if (!notifOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  async function handleInviteResponse(token: string, accept: boolean) {
    if (respondingToken) return;
    setRespondingToken(token);
    setInviteFeedback(null);

    try {
      const result = await respondToInvite(token, accept);
      if (result.success) {
        setInvites((prev) => prev.filter((invite) => invite.token !== token));
        router.refresh();
      } else {
        setInviteFeedback({ token, message: result.message });
      }
    } catch {
      setInviteFeedback({ token, message: "Something went wrong. Please try again." });
    } finally {
      setRespondingToken(null);
    }
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      setShowLogoutConfirm(false);
      setMobileOpen(false);
      router.push("/auth");
    } catch {
      setIsLoggingOut(false);
    }
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-8 mb-10">
        <h1 className="text-[32px] font-bold tracking-tight leading-[1.2]" style={{ color: "#ffb59d", fontFamily: "var(--font-geist-sans)" }}>
          AlgoMentor
        </h1>
        <p className="text-[12px] mt-1 opacity-70 uppercase tracking-[0.05em] font-medium" style={{ color: "#dfc0b6", fontFamily: "var(--font-geist-mono)" }}>
          Mentorship Program
        </p>
      </div>

      {/* Notifications */}
      <div className="px-6 mb-4 relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setNotifOpen((open) => !open)}
          className={`w-full flex items-center justify-between px-0 py-3 transition-all duration-300 ${
            notifOpen ? "text-[#ffb59d]" : "text-[#dfc0b6] hover:text-[#e5e1e4]"
          }`}
        >
          <span className="flex items-center">
            <span className="material-symbols-outlined mr-4">notifications</span>
            <span className="text-[16px]">Notifications</span>
          </span>
          {invites.length > 0 && (
            <span className="min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-[#f47144] text-[#5d1800] text-[12px] font-bold">
              {invites.length > 9 ? "9+" : invites.length}
            </span>
          )}
        </button>

        {notifOpen && (
          <div
            className="absolute left-full top-0 ml-2 w-80 max-w-[85vw] max-h-[440px] overflow-y-auto rounded-xl border border-white/10 z-80 shadow-2xl"
            style={{ background: "rgba(26, 25, 28, 0.98)", backdropFilter: "blur(24px)" }}
          >
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-[14px] font-bold text-[#e5e1e4]">Invitations</p>
            </div>

            {invites.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <span className="material-symbols-outlined text-[28px] text-[#dfc0b6] opacity-50">
                  notifications_off
                </span>
                <p className="text-[13px] text-[#dfc0b6] opacity-70 mt-2">No pending invitations.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {invites.map((invite) => {
                  const isResponding = respondingToken === invite.token;
                  const feedback = inviteFeedback?.token === invite.token ? inviteFeedback.message : null;
                  return (
                    <li key={invite.token} className="px-4 py-3">
                      <p className="text-[14px] text-[#e5e1e4] leading-snug">
                        <span className="font-semibold text-[#ffb59d]">{invite.mentorName}</span> invited you to
                        connect as their mentee.
                      </p>
                      <p className="text-[12px] text-[#dfc0b6] opacity-60 mt-1">{timeAgo(invite.createdAt)}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => void handleInviteResponse(invite.token, true)}
                          disabled={respondingToken !== null}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#f47144] text-[#5d1800] text-[13px] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
                        >
                          <span className={`material-symbols-outlined text-[16px] ${isResponding ? "animate-spin" : ""}`}>
                            {isResponding ? "progress_activity" : "check"}
                          </span>
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleInviteResponse(invite.token, false)}
                          disabled={respondingToken !== null}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-white/10 text-[#dfc0b6] text-[13px] font-semibold rounded-lg hover:bg-white/5 hover:text-[#e5e1e4] active:scale-95 transition-all disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                      {feedback && <p className="text-[12px] text-[#dfc0b6] opacity-80 mt-2">{feedback}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center px-6 py-3 transition-all duration-300 ${
              isActive(item.href)
                ? "text-[#ffb59d] font-bold border-l-4 border-[#ffb59d] bg-gradient-to-r from-[rgba(244,113,68,0.1)] to-transparent"
                : "text-[#dfc0b6] hover:bg-white/5 hover:text-[#e5e1e4]"
            }`}
          >
            <span className="material-symbols-outlined mr-4">{item.icon}</span>
            <span className="text-[16px]">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* New Task + Logout */}
      <div className="px-6 mb-8 space-y-3">
        <Link
          href="/dashboard/mentees"
          onClick={() => setMobileOpen(false)}
          className="w-full py-3 px-4 bg-[#f47144] text-[#5d1800] font-bold rounded-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">person_add</span>
          <span>Invite mentee</span>
        </Link>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3 px-4 border border-white/10 text-[#dfc0b6] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-white/5 hover:text-[#e5e1e4] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </div>

      {/* Footer Links */}
      <footer className="border-t border-white/10 pt-6 space-y-1">
        {FOOTER_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className="text-[#dfc0b6] flex items-center px-6 py-3 transition-colors hover:bg-white/5 hover:text-[#e5e1e4]"
          >
            <span className="material-symbols-outlined mr-4">{item.icon}</span>
            <span className="text-[16px]">{item.label}</span>
          </Link>
        ))}
      </footer>
    </>
  );

  const logoutDialog =
    isMounted && showLogoutConfirm
      ? createPortal(
          <div
            className="dashboard-logout-overlay"
            role="presentation"
            onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
          >
            <div
              className="dashboard-logout-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-dialog-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="logout-dialog-title" className="dashboard-logout-title">
                Log out?
              </h2>
              <p className="dashboard-logout-copy">
                You will be signed out of your account and redirected to the login page.
              </p>
              <div className="dashboard-logout-actions">
                <button
                  type="button"
                  className="dashboard-logout-cancel"
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={isLoggingOut}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="dashboard-logout-confirm"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging out…" : "Logout"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {logoutDialog}
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-[70] lg:hidden bg-[#201f22] border border-white/10 rounded-lg p-2 text-[#e5e1e4] hover:bg-white/10 transition-colors"
        aria-label="Open sidebar"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[55] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible, mobile: slide in */}
      <aside
        className={`
          w-[280px] h-screen fixed left-0 top-0
          border-r border-white/10 z-[60]
          flex flex-col py-8
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "rgba(19, 19, 21, 0.6)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 lg:hidden text-[#dfc0b6] hover:text-white transition-colors"
          aria-label="Close sidebar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {sidebarContent}
      </aside>
    </>
  );
}
