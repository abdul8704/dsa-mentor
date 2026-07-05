import Link from "next/link";
import { Suspense } from "react";
import { createSupabaseServerClient } from "../../lib/supabase/server-client";
import { isOnboardingCompleted } from "../../lib/auth/onboarding";
import { redirect } from "next/navigation";
import { getPaginatedSolvedProblems, getUserTopicOptions } from "../../actions/analytics.actions";
import type { SolvedProblemsFilters } from "../../lib/types/analytics";

import RecentProblemsTable from "../components/RecentProblemsTable";
import ProblemsFilterBar from "../components/ProblemsFilterBar";
import ProblemsPagination from "../components/ProblemsPagination";

const PAGE_SIZE = 10;

interface PageSearchParams {
  page?: string;
  search?: string;
  platform?: string;
  difficulty?: string;
  topic?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default async function AllSolvedProblemsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  if (!(await isOnboardingCompleted(user.id))) {
    redirect("/onboarding");
  }

  const page: number = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const filters: SolvedProblemsFilters = {
    search: params.search?.trim() || undefined,
    platform: params.platform || undefined,
    difficulty: params.difficulty || undefined,
    topic: params.topic || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  };

  const [{ problems, totalCount }, topics] = await Promise.all([
    getPaginatedSolvedProblems(user.id, page, PAGE_SIZE, filters),
    getUserTopicOptions(user.id),
  ]);

  const totalPages: number = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-[13px] text-[#dfc0b6] hover:text-[#ffb59d] transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
          arrow_back
        </span>
        Back to dashboard
      </Link>

      <RecentProblemsTable
        data={problems}
        variant="full"
        filterPanel={
          <Suspense fallback={null}>
            <ProblemsFilterBar topics={topics} />
          </Suspense>
        }
      />

      <Suspense fallback={null}>
        <ProblemsPagination currentPage={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} />
      </Suspense>
    </div>
  );
}
