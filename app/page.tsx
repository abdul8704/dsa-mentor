import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LandingPage from "./components/LandingPage";
import { createSupabaseServerClient } from "./lib/supabase/server-client";
import { isOnboardingCompleted } from "./lib/auth/onboarding";

export const metadata: Metadata = {
  title: "AlgoMentor | Track your DSA & competitive programming progress",
  description:
    "AlgoMentor unifies your solves, streaks, contest ratings, and topic analytics across coding platforms in one dashboard.",
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const completed = await isOnboardingCompleted(user.id);
    redirect(completed ? "/dashboard" : "/onboarding");
  }

  return <LandingPage />;
}
