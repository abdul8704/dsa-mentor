import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import InviteResponse from "./InviteResponse";

/**
 * Public invite-accept page (linked from invite emails).
 *
 * The invite itself is loaded with the service-role client so the page renders
 * meaningfully even before the recipient logs in (RLS would otherwise hide it).
 * The actual accept/decline mutation runs through the session-scoped
 * respondToInvite action, which re-validates ownership and email match.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    let mentorName = "A mentor";
    let status: string | null = null;
    let inviteeEmail: string | null = null;
    let isExpired = false;
    let notFound = false;

    try {
        const admin = getServiceRoleClient();
        const { data: invite } = await admin
            .from("invites")
            .select("mentor_id, invitee_email, status, expires_at")
            .eq("token", token)
            .maybeSingle();

        if (!invite) {
            notFound = true;
        } else {
            status = invite.status;
            inviteeEmail = invite.invitee_email;
            isExpired = new Date(invite.expires_at).getTime() < Date.now();

            const { data: mentor } = await admin
                .from("profile")
                .select("name")
                .eq("user_id", invite.mentor_id)
                .maybeSingle();
            mentorName = mentor?.name?.trim() || "A mentor";
        }
    } catch (error) {
        console.error(`[invite] Failed to load invite ${token}: ${error instanceof Error ? error.message : error}`);
        notFound = true;
    }

    // Determine the recipient's login state + whether their email matches.
    let isLoggedIn = false;
    let emailMatches = false;
    try {
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        isLoggedIn = Boolean(user);
        if (user?.email && inviteeEmail) {
            emailMatches = user.email.toLowerCase() === inviteeEmail.toLowerCase();
        }
    } catch {
        // Treated as logged-out.
    }

    return (
        <InviteResponse
            token={token}
            mentorName={mentorName}
            status={status}
            notFound={notFound}
            isExpired={isExpired}
            isLoggedIn={isLoggedIn}
            emailMatches={emailMatches}
            inviteeEmail={inviteeEmail}
        />
    );
}
