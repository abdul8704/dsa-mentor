import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { isActiveMentorship, requireUser } from "@/app/lib/mentorship/access";
import { getDashboardData } from "@/app/actions/analytics.actions";
import { getUpcomingContests, getRecentContestsWithAttendance } from "@/app/actions/contest.actions";
import { getAssignmentsForMentee, getAssignmentInsights } from "@/app/actions/assignment.actions";
import { getNotesForMentee } from "@/app/actions/note.actions";
import type { DashboardData, UpcomingContest, RecentContestsResult } from "@/app/lib/types/analytics";
import type { AssignmentInsights } from "@/app/lib/types/mentorship";

import ProfileCard from "../../components/ProfileCard";
import StreakStatsCard from "../../components/StreakStatsCard";
import RecentProblemsTable from "../../components/RecentProblemsTable";
import Heatmap from "../../components/Heatmap";
import StatsOverview from "../../components/StatsOverview";
import ContestRatingGraph from "../../components/ContestRatingGraph";
import TopicDonut from "../../components/TopicDonut";
import TopicProgressBars from "../../components/TopicProgressBars";
import UpcomingContests from "../../components/UpcomingContests";
import RecentContests from "../../components/RecentContests";
import AssignmentPanel from "./AssignmentPanel";
import NotesPanel from "./NotesPanel";
import AssignmentInsightsCard from "./AssignmentInsightsCard";

/**
 * Mentee detail page for mentors. Verifies an active mentorship, then renders
 * the mentee's dashboard exactly as they see it themselves (same components,
 * same order — no edits). Mentor-only tools (assign + notes, side by side)
 * and a performance rollup are appended at the very bottom.
 */
export default async function MenteeDetailPage({ params }: { params: Promise<{ menteeId: string }> }) {
    const { menteeId } = await params;

    const supabase = await createSupabaseServerClient();

    // Auth + authorization: must be logged in and actively mentor this user.
    let authorized = false;
    let isMentorViewingOther = false;
    try {
        const me = await requireUser(supabase);
        isMentorViewingOther = me.id !== menteeId && (await isActiveMentorship(supabase, me.id, menteeId));
        authorized = me.id === menteeId || isMentorViewingOther;
    } catch {
        redirect("/auth");
    }

    if (!authorized) {
        return <NotAuthorized />;
    }

    // Fetch analytics + mentor-only extras in parallel. Insights are fetched
    // (and rendered) only when a mentor is viewing someone else — a mentee
    // must never see this rollup about themselves.
    const [data, upcomingContests, recentContests, assignments, notes, insights] = await Promise.all([
        getDashboardData(menteeId) as Promise<DashboardData>,
        getUpcomingContests() as Promise<UpcomingContest[]>,
        getRecentContestsWithAttendance(menteeId) as Promise<RecentContestsResult>,
        getAssignmentsForMentee(menteeId),
        getNotesForMentee(menteeId),
        isMentorViewingOther ? getAssignmentInsights(menteeId) : Promise.resolve<AssignmentInsights | null>(null),
    ]);

    return (
        <div className="space-y-6">
            {/* Back link */}
            <Link
                href="/dashboard/mentees"
                className="inline-flex items-center gap-1 text-[13px] text-[#dfc0b6] hover:text-[#ffb59d] transition-colors w-fit"
            >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to mentees
            </Link>

            {/* Exact mirror of the mentee's own dashboard — same components, same order. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <ProfileCard profile={data.profile} streak={data.streak} userId={menteeId} />
                </div>
                <div>
                    <StreakStatsCard
                        streak={data.streak}
                        contestsAttended={recentContests.attendedCount}
                        contestsTotal={recentContests.total}
                    />
                </div>
            </div>

            <RecentProblemsTable data={data.recentProblems} />

            <Heatmap data={data.heatmap} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatsOverview difficulty={data.difficulty} platforms={data.platforms} />
                <ContestRatingGraph data={data.contestRating} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                    <TopicDonut data={data.topics} />
                </div>
                <div className="lg:col-span-6">
                    <TopicProgressBars data={data.topics.last7Days} />
                </div>
            </div>

            {/* Contests: Recent (attendance) + Upcoming — 50/50 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentContests
                    contests={recentContests.contests}
                    attendedCount={recentContests.attendedCount}
                    total={recentContests.total}
                />
                <UpcomingContests contests={upcomingContests} />
            </div>

            {/* Mentor-only tools, at the bottom: assign + notes share one 50/50 row. */}
            {isMentorViewingOther && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AssignmentPanel menteeId={menteeId} initialAssignments={assignments} />
                    <NotesPanel menteeId={menteeId} initialNotes={notes} />
                </div>
            )}

            {/* Mentor-only performance rollup — full row, always last. */}
            {isMentorViewingOther && insights && <AssignmentInsightsCard insights={insights} />}
        </div>
    );
}

function NotAuthorized() {
    return (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center gap-4">
            <span className="material-symbols-outlined text-[48px] text-[#ffb59d] opacity-70">lock</span>
            <div>
                <p className="text-[18px] font-semibold text-[#e5e1e4]">Not authorized</p>
                <p className="text-[#dfc0b6] opacity-80 mt-1">You are not an active mentor for this user.</p>
            </div>
            <Link href="/dashboard/mentees" className="text-[#ffb59d] hover:underline">
                Back to mentees
            </Link>
        </div>
    );
}
