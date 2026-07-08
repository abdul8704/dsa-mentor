import "server-only";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { deleteS3Prefix } from "@/app/lib/aws/s3-client";

/**
 * Every table that stores rows scoped to a user (directly or via a
 * mentor/mentee relationship), plus the column(s) that hold the user id.
 * `problems` is intentionally excluded — it's a shared, platform-wide
 * catalog, never user-scoped.
 *
 * Kept in sync with `dsa-mentor-worker/repository/admin.repo.ts`.
 */
const USER_SCOPED_TABLES: { table: string; columns: string[] }[] = [
    { table: "assignments", columns: ["mentor_id", "mentee_id"] },
    { table: "mentor_notes", columns: ["mentor_id", "mentee_id"] },
    { table: "mentee_group_members", columns: ["mentee_id"] },
    { table: "mentee_groups", columns: ["mentor_id"] },
    { table: "mentorships", columns: ["mentor_id", "mentee_id"] },
    { table: "invites", columns: ["mentor_id", "invitee_user_id"] },
    { table: "daily_count", columns: ["user_id"] },
    { table: "solved_problems", columns: ["user_id"] },
    { table: "user_contest", columns: ["user_id"] },
    { table: "user_platform_data", columns: ["user_id"] },
    { table: "user_platforms", columns: ["user_id"] },
    { table: "user-streak", columns: ["user_id"] },
    { table: "profile", columns: ["user_id"] },
];

export interface DeleteAccountResult {
    userId: string;
    deletedRows: Record<string, number>;
    avatarsDeleted: number;
    authUserDeleted: boolean;
    errors: string[];
}

/**
 * Permanently and irreversibly deletes a user's entire footprint:
 *   1. Every row in every user-scoped table (owner, mentor, or mentee side).
 *   2. All S3 avatar objects ever uploaded for this user (not just the
 *      current one — every past revision under `avatars/{userId}/`).
 *   3. The Supabase Auth user itself.
 *
 * Uses the service-role client so it bypasses RLS — this must only ever be
 * called for `me.id` after verifying the caller's own session, never for an
 * arbitrary user id supplied by a client.
 *
 * Best-effort across tables: a failure deleting one table doesn't stop the
 * others, so a partial failure never leaves cleanup half-started. Errors are
 * collected and returned so the caller can decide whether to still proceed
 * with deleting the auth user.
 */
export async function deleteAccountCompletely(userId: string): Promise<DeleteAccountResult> {
    const admin = getServiceRoleClient();
    const deletedRows: Record<string, number> = {};
    const errors: string[] = [];

    for (const { table, columns } of USER_SCOPED_TABLES) {
        let tableCount = 0;

        for (const column of columns) {
            const { data, error } = await admin.from(table).delete().eq(column, userId).select(column);

            if (error) {
                errors.push(`${table}.${column}: ${error.message}`);
                console.error(`[deleteAccount] Failed deleting ${table} where ${column}=${userId}: ${error.message}`);
                continue;
            }

            tableCount += data?.length ?? 0;
        }

        if (tableCount > 0) {
            deletedRows[table] = tableCount;
        }
    }

    const avatarsDeleted = await deleteS3Prefix(`avatars/${userId}/`);

    let authUserDeleted = false;
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) {
        // "User not found" just means it was already gone — not a failure.
        if (!authError.message.toLowerCase().includes("not found")) {
            errors.push(`auth.users: ${authError.message}`);
            console.error(`[deleteAccount] Failed deleting auth user ${userId}: ${authError.message}`);
        } else {
            authUserDeleted = true;
        }
    } else {
        authUserDeleted = true;
    }

    console.log(
        `[deleteAccount] user=${userId} deletedRows=${JSON.stringify(deletedRows)} avatarsDeleted=${avatarsDeleted} authUserDeleted=${authUserDeleted} errors=${errors.length}`
    );

    return { userId, deletedRows, avatarsDeleted, authUserDeleted, errors };
}
