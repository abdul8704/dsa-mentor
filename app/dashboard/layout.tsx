import type { Metadata } from "next";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import BackgroundEffects from "./components/BackgroundEffects";

export const metadata: Metadata = {
  title: "AlgoMentor | Analytics Dashboard",
  description: "Track your DSA progress, streaks, and competitive programming performance with AlgoMentor.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-shell">
      <Sidebar />
      <TopBar />
      <main className="lg:ml-[280px] pt-24 pb-12 px-4 lg:px-10 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <BackgroundEffects />
    </div>
  );
}
