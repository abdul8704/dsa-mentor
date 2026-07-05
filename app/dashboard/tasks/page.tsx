import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { redirect } from "next/navigation";
import { getMyTasks, } from "@/app/actions/assignment.actions";
import { getPendingInvitesForMe } from "@/app/actions/mentorship.actions";
import { getMyNotes } from "@/app/actions/note.actions";
import TasksClient from "./TasksClient";

/**
 * Mentee's task page. Shows problems assigned by mentors (auto-completed after
 * they're solved, with a manual fallback), notes from mentors, plus any
 * pending mentorship invites addressed to the current user's email.
 */
export default async function TasksPage() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    const [tasks, pendingInvites, notes] = await Promise.all([getMyTasks(), getPendingInvitesForMe(), getMyNotes()]);

    return <TasksClient tasks={tasks} pendingInvites={pendingInvites} notes={notes} />;
}
