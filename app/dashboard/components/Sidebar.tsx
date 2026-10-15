"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getBrowserClient } from "@/app/lib/supabase/browser-client";
import { respondToInvite } from "@/app/actions/mentorship.actions";
import type { PendingInvite } from "@/app/lib/types/mentorship";
import { LogoMark } from "@/app/components/brand/Logo";

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

const NAV_GROUPS = [
  {
    label: "Practice",
    items: [
      { label: "Dashboard", icon: "space_dashboard", href: "/dashboard" },
      { label: "Solved problems", icon: "checklist", href: "/dashboard/problems" },
      { label: "Goals", icon: "flag", href: "/dashboard/goals" },
    ],
  },
  {
    label: "Mentoring",
    items: [
      { label: "Mentees", icon: "group", href: "/dashboard/mentees" },
      { label: "Tasks", icon: "assignment", href: "/dashboard/tasks" },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Settings", icon: "settings", href: "/dashboard/settings" }],
  },
];

/** Nav link with a gradient indicator bar and tinted background when current. */
function NavLink({
  href,
  icon,
  label,
  active,
  onNavigate,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 min-h-[40px] px-3 rounded-[var(--dash-r-md)] text-[14px] transition-[background-color,color] duration-[var(--dash-dur-fast)] ${
        active
          ? "font-semibold text-[color:var(--dash-content-primary)] bg-[color:var(--dash-accent-wash)]"
          : "text-[color:var(--dash-content-secondary)] hover:text-[color:var(--dash-content-primary)] hover:bg-[color:var(--dash-surface-sunken)]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-[transform,opacity] duration-[var(--dash-dur-base)] ${
          active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-50 group-hover:opacity-60 group-hover:scale-y-75"
        }`}
        style={{ background: "var(--dash-grad-accent-v)" }}
      />
      <span
        className={`material-symbols-outlined text-[20px] transition-transform duration-[var(--dash-dur-base)] group-hover:translate-x-0.5 ${
          active ? "text-[color:var(--dash-accent)]" : ""
        }`}
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
        aria-hidden="true"
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

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

  const isActiveHref = isActive;

  const sidebarContent = (
    <>
      {/* Brand */}
      <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="group flex items-center gap-3 px-5 mb-6">
        <LogoMark size={36} glow className="transition-transform duration-[var(--dash-dur-base)] group-hover:rotate-[-6deg] group-hover:scale-105" />
        <span>
          <span className="block text-[17px] font-extrabold tracking-[-0.02em] text-[color:var(--dash-content-primary)]">AlgoMentor</span>
          <span className="block text-[11px] text-[color:var(--dash-content-tertiary)]">Mentorship Program</span>
        </span>
      </Link>

      {/* Notifications */}
      <div className="px-3 mb-2 relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setNotifOpen((open) => !open)}
          aria-expanded={notifOpen}
          className={`w-full flex items-center justify-between gap-3 min-h-[40px] px-3 rounded-[var(--dash-r-md)] text-[14px] transition-colors duration-[var(--dash-dur-fast)] ${
            notifOpen
              ? "text-[color:var(--dash-content-primary)] bg-[color:var(--dash-surface-sunken)]"
              : "text-[color:var(--dash-content-secondary)] hover:text-[color:var(--dash-content-primary)] hover:bg-[color:var(--dash-surface-sunken)]"
          }`}
        >
          <span className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">notifications</span>
            Notifications
          </span>
          {invites.length > 0 && (
            <span
              className="dash-num min-w-[22px] h-[22px] px-1.5 grid place-items-center rounded-full text-[11px] font-semibold text-[color:var(--dash-content-on-accent)] animate-pulse"
              style={{ background: "var(--dash-grad-accent)" }}
            >
              {invites.length > 9 ? "9+" : invites.length}
            </span>
          )}
        </button>

        {notifOpen && (
          <div
            className="dash-anim-rise absolute left-3 right-3 lg:left-full lg:right-auto top-full lg:top-0 mt-1 lg:mt-0 lg:ml-2 lg:w-80 max-h-[440px] overflow-y-auto rounded-[var(--dash-r-lg)] border border-[color:var(--dash-border-strong)] z-80"
            style={{ background: "var(--dash-surface-raised)", boxShadow: "var(--dash-shadow-2)" }}
          >
            <div className="px-4 py-3 border-b border-[color:var(--dash-border-subtle)]">
              <p className="text-[14px] font-bold text-[color:var(--dash-content-primary)]">Invitations</p>
            </div>

            {invites.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <span className="material-symbols-outlined text-[28px] text-[color:var(--dash-content-tertiary)]" aria-hidden="true">
                  notifications_off
                </span>
                <p className="text-[13px] text-[color:var(--dash-content-secondary)] mt-2">No pending invitations.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[color:var(--dash-border-subtle)]">
                {invites.map((invite) => {
                  const isResponding = respondingToken === invite.token;
                  const feedback = inviteFeedback?.token === invite.token ? inviteFeedback.message : null;
                  return (
                    <li key={invite.token} className="px-4 py-3">
                      <p className="text-[14px] text-[color:var(--dash-content-primary)] leading-snug">
                        <span className="font-semibold text-[color:var(--dash-accent-soft)]">{invite.mentorName}</span> invited you to
                        connect as their mentee.
                      </p>
                      <p className="text-[12px] text-[color:var(--dash-content-tertiary)] mt-1">{timeAgo(invite.createdAt)}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => void handleInviteResponse(invite.token, true)}
                          disabled={respondingToken !== null}
                          className="dash-btn dash-btn-primary dash-btn-sm flex-1"
                        >
                          <span className={`material-symbols-outlined text-[16px] ${isResponding ? "animate-spin" : ""}`} aria-hidden="true">
                            {isResponding ? "progress_activity" : "check"}
                          </span>
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleInviteResponse(invite.token, false)}
                          disabled={respondingToken !== null}
                          className="dash-btn dash-btn-ghost dash-btn-sm flex-1"
                        >
                          Decline
                        </button>
                      </div>
                      {feedback && <p className="text-[12px] text-[color:var(--dash-content-secondary)] mt-2">{feedback}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-5 mt-2" aria-label="Dashboard">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold text-[color:var(--dash-content-tertiary)]">{group.label}</p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  active={isActiveHref(item.href)}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Invite + Logout */}
      <div className="px-3 pt-4 mt-4 border-t border-[color:var(--dash-border-subtle)] flex flex-col gap-2">
        <Link href="/dashboard/mentees" onClick={() => setMobileOpen(false)} className="dash-btn dash-btn-primary w-full">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_add</span>
          Invite mentee
        </Link>
        <button type="button" onClick={() => setShowLogoutConfirm(true)} className="dash-btn dash-btn-ghost w-full">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
          Logout
        </button>
      </div>
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
        className="fixed top-4 left-4 z-[70] lg:hidden w-11 h-11 grid place-items-center rounded-[var(--dash-r-md)] border border-[color:var(--dash-border-strong)] bg-[color:var(--dash-surface-raised)] text-[color:var(--dash-content-primary)] hover:bg-[color:var(--dash-surface-hover)] transition-colors"
        aria-label="Open sidebar"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[55] lg:hidden bg-[color:var(--dash-surface-overlay)] backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible, mobile: slide in */}
      <aside
        className={`
          w-[248px] h-screen fixed left-0 top-0
          border-r border-[color:var(--dash-border-subtle)] z-[60]
          flex flex-col py-6
          transition-transform duration-[var(--dash-dur-slow)] ease-[var(--dash-ease)]
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "linear-gradient(180deg, rgba(47,196,141,0.05), transparent 30%), var(--dash-surface-base)",
        }}
      >
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-3 lg:hidden w-10 h-10 grid place-items-center rounded-[var(--dash-r-md)] text-[color:var(--dash-content-secondary)] hover:text-[color:var(--dash-content-primary)] hover:bg-[color:var(--dash-surface-sunken)] transition-colors"
          aria-label="Close sidebar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {sidebarContent}
      </aside>
    </>
  );
}
