import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { redirect } from "next/navigation";
import { getMyMentees, getSentInvites } from "@/app/actions/mentorship.actions";
import { getMyGroups } from "@/app/actions/group.actions";
import MenteesClient from "./MenteesClient";

/**
 * Mentor's roster page. Shows mentee groups (mentor-only, mentees are never
 * aware of their group membership) plus a stats table of every mentee, and
 * provides the invite entry point (search users / invite by email).
 */
export default async function MenteesPage() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    // Load roster + groups + sent invites in parallel.
    const [mentees, groups, sentInvites] = await Promise.all([getMyMentees(), getMyGroups(), getSentInvites()]);

    return <MenteesClient mentees={mentees} groups={groups} sentInvites={sentInvites} />;
}
