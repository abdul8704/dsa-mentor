"use server";

import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { sendEmail, buildInviteEmail } from "@/app/lib/email/mailer";
import { requireUser, isActiveMentorship } from "@/app/lib/mentorship/access";
import { getRecentContestAttendanceForUsers } from "@/app/actions/contest.actions";
import type {
    UserSearchResult,
    MenteeSummary,
    PendingInvite,
    SentInvite,
    ActionResult,
    InviteResult,
} from "@/app/lib/types/mentorship";

// A mentee is flagged inactive after more than this many days without a solve.
const INACTIVE_THRESHOLD_DAYS = 7;

/** YYYY-MM-DD for `daysAgo` days before today (UTC). */
function isoDaysAgo(daysAgo: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - daysAgo);
    return d.toISOString().split("T")[0]!;
}

function daysBetween(fromIso: string, toDate: Date): number {
    const from = new Date(`${fromIso}T00:00:00.000Z`).getTime();
    return Math.floor((toDate.getTime() - from) / (24 * 60 * 60 * 1000));
}

// ──────────────────────────────────────────────────────────────────────────
// searchUsers — mentor looks for existing registered users to invite.
// Reads profile.name + user_platforms.handle (both are world-readable via RLS).
// ──────────────────────────────────────────────────────────────────────────
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
        // Avoid returning the entire user base for tiny/empty queries.
        return [];
    }

    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        console.log(`[mentorship] searchUsers query="${trimmed}" by ${me.id}`);

        // Match by profile name and by platform handle in parallel.
        const [{ data: byName }, { data: byHandle }] = await Promise.all([
            supabase.from("profile").select("user_id, name").ilike("name", `%${trimmed}%`).limit(20),
            supabase.from("user_platforms").select("user_id, platform, handle").ilike("handle", `%${trimmed}%`).limit(40),
        ]);

        // Collect unique candidate user ids (excluding the mentor themselves).
        const userIds = new Set<string>();
        (byName ?? []).forEach((r) => r.user_id && r.user_id !== me.id && userIds.add(r.user_id));
        (byHandle ?? []).forEach((r) => r.user_id && r.user_id !== me.id && userIds.add(r.user_id));

        if (userIds.size === 0) {
            return [];
        }

        const ids = [...userIds];

        // Fetch names, all handles, existing relationships and pending invites.
        const [{ data: profiles }, { data: platforms }, { data: mentorships }, { data: invites }] =
            await Promise.all([
                supabase.from("profile").select("user_id, name").in("user_id", ids),
                supabase.from("user_platforms").select("user_id, platform, handle").in("user_id", ids),
                supabase
                    .from("mentorships")
                    .select("mentee_id")
                    .eq("mentor_id", me.id)
                    .eq("status", "active")
                    .in("mentee_id", ids),
                supabase
                    .from("invites")
                    .select("invitee_user_id")
                    .eq("mentor_id", me.id)
                    .eq("status", "pending")
                    .in("invitee_user_id", ids),
            ]);

        const nameMap = new Map<string, string>();
        (profiles ?? []).forEach((p) => p.user_id && nameMap.set(p.user_id, p.name ?? "Unnamed user"));

        const handleMap = new Map<string, Record<string, string>>();
        (platforms ?? []).forEach((p) => {
            if (!p.user_id) return;
            const entry = handleMap.get(p.user_id) ?? {};
            entry[p.platform] = p.handle;
            handleMap.set(p.user_id, entry);
        });

        const connected = new Set((mentorships ?? []).map((m) => m.mentee_id));
        const pending = new Set((invites ?? []).map((i) => i.invitee_user_id).filter(Boolean) as string[]);

        return ids.map((userId) => ({
            userId,
            name: nameMap.get(userId) ?? "Unnamed user",
            handles: handleMap.get(userId) ?? {},
            alreadyConnected: connected.has(userId),
            invitePending: pending.has(userId),
        }));
    } catch (error) {
        console.error(`[mentorship] searchUsers failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}

// ──────────────────────────────────────────────────────────────────────────
// sendInvite — invite an existing user (by userId) or any email address.
// ──────────────────────────────────────────────────────────────────────────
export async function sendInvite(params: { userId?: string; email?: string }): Promise<InviteResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        // Resolve the target email + optional existing user id.
        let inviteeEmail: string | null = params.email?.trim().toLowerCase() ?? null;
        let inviteeUserId: string | null = params.userId ?? null;

        if (inviteeUserId) {
            // Existing user: resolve their email via the admin API (server-only).
            const admin = getServiceRoleClient();
            const { data, error } = await admin.auth.admin.getUserById(inviteeUserId);
            if (error || !data?.user?.email) {
                console.error(`[mentorship] Could not resolve email for user ${inviteeUserId}: ${error?.message}`);
                return { success: false, message: "Could not find that user's email." };
            }
            inviteeEmail = data.user.email.toLowerCase();
        }

        if (!inviteeEmail) {
            return { success: false, message: "Provide a user or an email address to invite." };
        }

        if (me.email && inviteeEmail === me.email.toLowerCase()) {
            return { success: false, message: "You can't invite yourself." };
        }

        // Prevent duplicate active mentorship (only checkable for known users).
        if (inviteeUserId && (await isActiveMentorship(supabase, me.id, inviteeUserId))) {
            return { success: false, message: "You already mentor this user." };
        }

        // Prevent duplicate pending invite to the same email.
        const { data: existing } = await supabase
            .from("invites")
            .select("id")
            .eq("mentor_id", me.id)
            .eq("invitee_email", inviteeEmail)
            .eq("status", "pending")
            .maybeSingle();

        if (existing) {
            return { success: false, message: "You already have a pending invite for this person." };
        }

        // Insert the invite (token defaults to a random uuid in the DB).
        const { data: invite, error: insertError } = await supabase
            .from("invites")
            .insert({ mentor_id: me.id, invitee_email: inviteeEmail, invitee_user_id: inviteeUserId })
            .select("token")
            .single();

        if (insertError || !invite) {
            console.error(`[mentorship] Failed to create invite: ${insertError?.message}`);
            return { success: false, message: "Could not create the invite. Please try again." };
        }

        // Look up mentor's display name for the email body.
        const { data: mentorProfile } = await supabase
            .from("profile")
            .select("name")
            .eq("user_id", me.id)
            .maybeSingle();
        const mentorName = mentorProfile?.name?.trim() || "A mentor";

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const acceptUrl = `${appUrl}/invite/${invite.token}`;
        const { subject, html, text } = buildInviteEmail(mentorName, acceptUrl);

        const emailResult = await sendEmail({ to: inviteeEmail, subject, html, text });

        console.log(`[mentorship] Invite created for ${inviteeEmail} by ${me.id} (emailSent=${emailResult.sent})`);

        return {
            success: true,
            message: emailResult.sent
                ? `Invite sent to ${inviteeEmail}.`
                : `Invite created for ${inviteeEmail}. Email wasn't sent — share the link below instead.`,
            inviteUrl: acceptUrl,
        };
    } catch (error) {
        console.error(`[mentorship] sendInvite failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong sending the invite." };
    }
}

// ──────────────────────────────────────────────────────────────────────────
// respondToInvite — invitee accepts or declines. On accept, creates the
// mentorship (mentee_id = current user).
// ──────────────────────────────────────────────────────────────────────────
export async function respondToInvite(token: string, accept: boolean): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        // RLS lets the invitee read the invite by email/user match.
        const { data: invite, error } = await supabase
            .from("invites")
            .select("id, mentor_id, invitee_email, status, expires_at")
            .eq("token", token)
            .maybeSingle();

        if (error || !invite) {
            return { success: false, message: "This invitation could not be found." };
        }

        if (invite.status !== "pending") {
            return { success: false, message: `This invitation was already ${invite.status}.` };
        }

        if (new Date(invite.expires_at).getTime() < Date.now()) {
            await supabase.from("invites").update({ status: "expired" }).eq("id", invite.id);
            return { success: false, message: "This invitation has expired." };
        }

        // Ensure the logged-in user's email matches the invite.
        if (me.email && invite.invitee_email.toLowerCase() !== me.email.toLowerCase()) {
            return { success: false, message: "This invitation was sent to a different email address." };
        }

        if (!accept) {
            await supabase
                .from("invites")
                .update({ status: "declined", responded_at: new Date().toISOString(), invitee_user_id: me.id })
                .eq("id", invite.id);
            console.log(`[mentorship] Invite ${invite.id} declined by ${me.id}`);
            return { success: true, message: "Invitation declined." };
        }

        if (invite.mentor_id === me.id) {
            return { success: false, message: "You can't accept your own invitation." };
        }

        // Create the mentorship (idempotent via unique(mentor_id, mentee_id)).
        const { error: mErr } = await supabase
            .from("mentorships")
            .upsert(
                { mentor_id: invite.mentor_id, mentee_id: me.id, status: "active" },
                { onConflict: "mentor_id,mentee_id" }
            );

        if (mErr) {
            console.error(`[mentorship] Failed to create mentorship: ${mErr.message}`);
            return { success: false, message: "Could not accept the invitation. Please try again." };
        }

        await supabase
            .from("invites")
            .update({ status: "accepted", responded_at: new Date().toISOString(), invitee_user_id: me.id })
            .eq("id", invite.id);

        console.log(`[mentorship] Invite ${invite.id} accepted by ${me.id}`);
        return { success: true, message: "Invitation accepted. You're now connected with your mentor." };
    } catch (error) {
        console.error(`[mentorship] respondToInvite failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong responding to the invitation." };
    }
}

// ──────────────────────────────────────────────────────────────────────────
// getPendingInvitesForMe — invites addressed to the current user's email.
// ──────────────────────────────────────────────────────────────────────────
export async function getPendingInvitesForMe(): Promise<PendingInvite[]> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);
        if (!me.email) return [];

        const { data: invites, error } = await supabase
            .from("invites")
            .select("token, mentor_id, created_at, expires_at")
            .eq("invitee_email", me.email.toLowerCase())
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (error || !invites?.length) return [];

        // Resolve mentor display names.
        const mentorIds = [...new Set(invites.map((i) => i.mentor_id))];
        const { data: profiles } = await supabase.from("profile").select("user_id, name").in("user_id", mentorIds);
        const nameMap = new Map<string, string>();
        (profiles ?? []).forEach((p) => p.user_id && nameMap.set(p.user_id, p.name ?? "A mentor"));

        return invites.map((i) => ({
            token: i.token,
            mentorName: nameMap.get(i.mentor_id) ?? "A mentor",
            createdAt: i.created_at,
            expiresAt: i.expires_at,
        }));
    } catch (error) {
        console.error(`[mentorship] getPendingInvitesForMe failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}

// ──────────────────────────────────────────────────────────────────────────
// getSentInvites — invites the current mentor has sent (for the mentor UI).
// ──────────────────────────────────────────────────────────────────────────
export async function getSentInvites(): Promise<SentInvite[]> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const { data, error } = await supabase
            .from("invites")
            .select("id, invitee_email, status, created_at, expires_at")
            .eq("mentor_id", me.id)
            .order("created_at", { ascending: false });

        if (error || !data) return [];

        return data.map((i) => ({
            id: i.id,
            inviteeEmail: i.invitee_email,
            status: i.status as SentInvite["status"],
            createdAt: i.created_at,
            expiresAt: i.expires_at,
        }));
    } catch (error) {
        console.error(`[mentorship] getSentInvites failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}

// ──────────────────────────────────────────────────────────────────────────
// getMyMentees — roster with quick stats for the mentor dashboard.
// ──────────────────────────────────────────────────────────────────────────
export async function getMyMentees(): Promise<MenteeSummary[]> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const { data: mentorships, error } = await supabase
            .from("mentorships")
            .select("mentee_id")
            .eq("mentor_id", me.id)
            .eq("status", "active");

        if (error || !mentorships?.length) return [];

        const menteeIds = mentorships.map((m) => m.mentee_id);
        // "Last 7 days" = the 7 calendar days ending today (6 days ago → today),
        // so the count matches the 7-bar chart breakdown.
        const sixDaysAgo = isoDaysAgo(6);
        const sevenDaysAgo = isoDaysAgo(7);
        const now = new Date();

        // Real last-7-days contest attendance across all platforms, resolved
        // once for the whole roster (shared schedule + one attendance query)
        // so each row shows attended/total against the actual contests held —
        // matching the personal dashboard rather than a stale hardcoded /7.
        const contestAttendance = await getRecentContestAttendanceForUsers(menteeIds);

        // Build a summary per mentee. Queries are per-mentee but run in parallel.
        const summaries = await Promise.all(
            menteeIds.map(async (menteeId): Promise<MenteeSummary> => {
                const [profileRes, streakRes, weekRes, lastRes, assignmentsRes, tagsRes, totalSolvedRes, solvedTodayRes] =
                    await Promise.all([
                        supabase.from("profile").select("name").eq("user_id", menteeId).maybeSingle(),
                        supabase.from("user-streak").select("curr_streak, longest_streak").eq("user_id", menteeId).maybeSingle(),
                        // Per-day solved_date rows (last 7 days) — used for both the count and the chart breakdown.
                        supabase
                            .from("solved_problems")
                            .select("solved_date")
                            .eq("user_id", menteeId)
                            .gte("solved_date", sixDaysAgo),
                        supabase
                            .from("solved_problems")
                            .select("solved_date")
                            .eq("user_id", menteeId)
                            .order("solved_date", { ascending: false })
                            .limit(1)
                            .maybeSingle(),
                        supabase.from("assignments").select("status").eq("mentee_id", menteeId).eq("mentor_id", me.id),
                        supabase
                            .from("solved_problems")
                            .select("problems(tags)")
                            .eq("user_id", menteeId)
                            .gte("solved_date", sevenDaysAgo),
                        supabase
                            .from("solved_problems")
                            .select("problem_id", { count: "exact", head: true })
                            .eq("user_id", menteeId),
                        supabase
                            .from("solved_problems")
                            .select("problem_id", { count: "exact", head: true })
                            .eq("user_id", menteeId)
                            .eq("solved_date", isoDaysAgo(0)),
                    ]);

                const lastActiveDate = lastRes.data?.solved_date ?? null;
                const daysSinceActive = lastActiveDate ? daysBetween(lastActiveDate, now) : null;

                const assignments = assignmentsRes.data ?? [];
                const total = assignments.length;
                const completed = assignments.filter((a) => a.status === "completed").length;

                // Per-day breakdown for the last 7 days (index 0 = 7 days ago, index 6 = today).
                const last7DaysBreakdown = new Array(7).fill(0) as number[];
                const dateCountMap: Record<string, number> = {};
                for (const row of weekRes.data ?? []) {
                    dateCountMap[row.solved_date] = (dateCountMap[row.solved_date] ?? 0) + 1;
                }
                for (let i = 0; i < 7; i++) {
                    const dateStr = isoDaysAgo(6 - i);
                    last7DaysBreakdown[i] = dateCountMap[dateStr] ?? 0;
                }
                const last7DaysSolved = (weekRes.data ?? []).length;

                // Top 3 most-frequent tags among problems solved in the last 7 days.
                const tagCounts = new Map<string, number>();
                for (const row of (tagsRes.data ?? []) as unknown as { problems: { tags: string[] | null } | null }[]) {
                    for (const tag of row.problems?.tags ?? []) {
                        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
                    }
                }
                const topTags = [...tagCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([tag]) => tag);

                // `curr_streak`/`longest_streak` are confirmed only through
                // *yesterday* (see dsa-mentor-worker/jobs/streak.ts) — add
                // today's already-fetched live solved count on top, same as
                // the personal dashboard's getStreakData.
                const solvedToday = solvedTodayRes.count ?? 0;
                const confirmedStreak = streakRes.data?.curr_streak ?? 0;
                const currentStreak = solvedToday > 0 ? confirmedStreak + 1 : confirmedStreak;
                const longestStreak = Math.max(streakRes.data?.longest_streak ?? 0, currentStreak);

                return {
                    userId: menteeId,
                    name: profileRes.data?.name?.trim() || "Unnamed mentee",
                    currentStreak,
                    longestStreak,
                    totalSolved: totalSolvedRes.count ?? 0,
                    solvedToday,
                    last7DaysSolved,
                    last7DaysBreakdown,
                    contestsThisWeek: contestAttendance.attendedByUser[menteeId] ?? 0,
                    contestsTotal: contestAttendance.total,
                    topTags,
                    lastActiveDate,
                    daysSinceActive,
                    isInactive: daysSinceActive === null || daysSinceActive >= INACTIVE_THRESHOLD_DAYS,
                    totalAssignments: total,
                    completedAssignments: completed,
                    completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
                    pendingAssignments: total - completed,
                };
            })
        );

        return summaries.sort((a, b) => Number(b.isInactive) - Number(a.isInactive));
    } catch (error) {
        console.error(`[mentorship] getMyMentees failed: ${error instanceof Error ? error.message : error}`);
        return [];
    }
}
