import "server-only";
import { createHash, randomBytes } from "crypto";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";

/**
 * Credentials for the desktop widget's pairing flow.
 *
 * Nothing secret is stored: the database only holds SHA-256 hashes of the
 * device code and the access token, so a database leak cannot be replayed.
 * Both secrets are 256-bit random values, so an unsalted hash is sufficient.
 */

export const LINK_CODE_TTL_SECONDS = 600;
export const LINK_POLL_INTERVAL_SECONDS = 2;
export const DEVICE_NAME_MAX = 60;
const TOKEN_PREFIX = "amw_";

/** No 0/O/1/I/L so a code is easy to compare by eye. */
const USER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

export function newDeviceCode(): string {
    return randomBytes(32).toString("base64url");
}

export function newAccessToken(): string {
    return TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

/** "K7QF-29XM": 8 chars from a 31-letter alphabet (~40 bits), single use, 10 min. */
export function newUserCode(): string {
    const bytes = randomBytes(8);
    let code = "";
    for (let i = 0; i < 8; i++) code += USER_CODE_ALPHABET[bytes[i] % USER_CODE_ALPHABET.length];
    return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalizeUserCode(raw: string): string {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

export function cleanDeviceName(raw: unknown): string {
    const text = typeof raw === "string" ? raw.replace(/[\u0000-\u001f<>]/g, "").trim() : "";
    return (text || "LeetCode Widget").slice(0, DEVICE_NAME_MAX);
}

export interface WidgetAuth {
    tokenId: string;
    userId: string;
}

/** Resolves `Authorization: Bearer amw_…` to a live (non-revoked) token, or null. */
export async function authenticateWidget(req: Request): Promise<WidgetAuth | null> {
    const header = req.headers.get("authorization") ?? "";
    const match = header.match(/^Bearer\s+(amw_[A-Za-z0-9_-]{20,100})$/);
    if (!match) return null;

    const db = getServiceRoleClient();
    const { data, error } = await db
        .from("widget_tokens")
        .select("id, user_id, revoked_at")
        .eq("token_hash", sha256(match[1]))
        .maybeSingle();

    if (error) throw new Error(`token lookup failed: ${error.message}`);
    if (!data || data.revoked_at) return null;

    // Best-effort; a failed timestamp update must not fail the request.
    void db.from("widget_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);

    return { tokenId: data.id, userId: data.user_id };
}
