import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { requireUser } from "@/app/lib/mentorship/access";
import { deleteAccountCompletely } from "@/app/lib/account/delete-account";

/** Client must send this exact string to confirm — a lightweight guard against accidental/CSRF-triggered wipes. */
const CONFIRMATION_PHRASE = "DELETE";

/**
 * Permanently deletes the caller's own account: every row that references
 * them across every table (solved problems, streaks, contests, platform
 * handles, mentor/mentee relationships, groups, notes, invites, profile),
 * every avatar ever uploaded, and the Supabase Auth user itself.
 *
 * This is irreversible. The caller must POST `{ "confirmation": "DELETE" }`.
 */
export async function POST(req: NextRequest) {
    let supabase;
    let me;
    try {
        supabase = await createSupabaseServerClient();
        me = await requireUser(supabase);
    } catch {
        return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
    }

    const confirmation = (body as { confirmation?: unknown } | null)?.confirmation;
    if (confirmation !== CONFIRMATION_PHRASE) {
        return NextResponse.json(
            { success: false, message: `Send { "confirmation": "${CONFIRMATION_PHRASE}" } to confirm this irreversible action.` },
            { status: 400 }
        );
    }

    const result = await deleteAccountCompletely(me.id);

    if (!result.authUserDeleted) {
        console.error(`[api/account/delete] Failed to fully delete account ${me.id}: ${result.errors.join("; ")}`);
        return NextResponse.json(
            { success: false, message: "Something went wrong deleting your account. Please try again or contact support." },
            { status: 500 }
        );
    }

    // Best-effort: clear the now-invalid session cookies for this browser.
    await supabase.auth.signOut();

    console.log(`[api/account/delete] Account ${me.id} deleted.`);
    return NextResponse.json({ success: true, message: "Your account and all associated data have been permanently deleted." });
}
