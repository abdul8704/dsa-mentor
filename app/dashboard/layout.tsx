import type { Metadata } from "next";
import Sidebar from "./components/Sidebar";
import BackgroundEffects from "./components/BackgroundEffects";
import { getPendingInvitesForMe } from "../actions/mentorship.actions";
import type { PendingInvite } from "../lib/types/mentorship";

export const metadata: Metadata = {
  title: "AlgoMentor | Analytics Dashboard",
  description: "Track your DSA progress, streaks, and competitive programming performance with AlgoMentor.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pendingInvites: PendingInvite[] = await getPendingInvitesForMe();

  return (
    <div className="dashboard-shell">
      <Sidebar initialInvites={pendingInvites} />
      <main className="lg:ml-[280px] pt-20 lg:pt-8 pb-12 px-4 lg:px-10 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <BackgroundEffects />
    </div>
  );
}
