import type { Metadata } from "next";
import LandingPage from "./components/LandingPage";

export const metadata: Metadata = {
  title: "AlgoMentor | Track your DSA & competitive programming progress",
  description:
    "AlgoMentor unifies your solves, streaks, contest ratings, and topic analytics across coding platforms in one dashboard.",
};

export default function Home() {
  return <LandingPage />;
}
