import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { getMyMentees } from "@/app/actions/mentorship.actions";
import { getGroupDetail } from "@/app/actions/group.actions";
import GroupMenteesClient from "./GroupMenteesClient";

/**
 * Group detail page: the same mentee stats table shown on `/dashboard/mentees`,
 * filtered down to only the mentees currently in this group.
 */
export default async function GroupMenteesPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;

    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    const [group, allMentees] = await Promise.all([getGroupDetail(groupId), getMyMentees()]);

    if (!group) {
        return <GroupNotFound />;
    }

    const memberIds = new Set(group.memberIds);
    const mentees = allMentees.filter((m) => memberIds.has(m.userId));

    return <GroupMenteesClient groupName={group.name} mentees={mentees} />;
}

function GroupNotFound() {
    return (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center gap-4">
            <span className="material-symbols-outlined text-[48px] text-[#ffb59d] opacity-70">group_off</span>
            <div>
                <p className="text-[18px] font-semibold text-[#e5e1e4]">Group not found</p>
                <p className="text-[#dfc0b6] opacity-80 mt-1">It may have been deleted, or you don&apos;t own it.</p>
            </div>
            <Link href="/dashboard/mentees" className="text-[#ffb59d] hover:underline">
                Back to mentees
            </Link>
        </div>
    );
}
