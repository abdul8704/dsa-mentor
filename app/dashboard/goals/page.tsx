import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { getGoalOwners, getGoals } from "@/app/actions/goals.actions";
import GoalsClient from "./GoalsClient";

/**
 * Goals page. Shows the current user's goals, or — with `?user=<menteeId>` —
 * the goals of a mentee they actively mentor (who they can also create and
 * edit goals for). Progress is computed live from synced solves.
 */
export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/auth");

    const owners = await getGoalOwners();
    const requested = (await searchParams).user;
    // Unknown or no-longer-mentored ids fall back to the user's own goals.
    const owner = owners.find((o) => o.userId === requested) ?? owners.find((o) => o.isMe);
    const ownerId = owner?.userId ?? user.id;

    const goals = await getGoals(ownerId);

    return <GoalsClient goals={goals} owners={owners} ownerId={ownerId} />;
}
