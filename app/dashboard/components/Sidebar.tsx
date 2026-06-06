"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getBrowserClient } from "@/app/lib/supabase/browser-client";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Mentees", icon: "group", href: "/dashboard/mentees" },
  { label: "Curriculum", icon: "terminal", href: "/dashboard/curriculum" },
  { label: "Tasks", icon: "assignment", href: "/dashboard/tasks" },
  { label: "Analytics", icon: "insights", href: "/dashboard/analytics" },
  { label: "Community", icon: "forum", href: "/dashboard/community" },
];

const FOOTER_ITEMS = [
  { label: "Settings", icon: "settings", href: "/dashboard/settings" },
  { label: "Support", icon: "help", href: "/dashboard/support" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getBrowserClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        <button className="w-full py-3 px-4 bg-[#f47144] text-[#5d1800] font-bold rounded-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all">
          <span className="material-symbols-outlined">add_task</span>
          <span>New Task</span>
        </button>
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
