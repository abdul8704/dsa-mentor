/**
 * Shared constants for the opt-in public API. Imported by both the API route
 * handlers and the Settings form, so this file must stay free of server-only
 * imports.
 *
 * Must stay in sync with the `widgets` check constraint in
 * dsa-mentor-worker/supabase/migrations/20261007120000_public_profiles.sql.
 */

export const PUBLIC_WIDGETS = [
    "profile",
    "streak",
    "heatmap",
    "stats",
    "contest-rating",
    "topics",
    "recent-problems",
    "contests",
] as const;

export type PublicWidget = (typeof PUBLIC_WIDGETS)[number];

/** Human-readable label and the dashboard component each widget mirrors. */
export const PUBLIC_WIDGET_LABELS: Record<PublicWidget, string> = {
    profile: "Profile (name, bio, avatar)",
    streak: "Streak & activity stats",
    heatmap: "Activity heatmap (last 364 days)",
    stats: "Solved by difficulty & platform ratings",
    "contest-rating": "Contest rating history",
    topics: "Topic breakdown",
    "recent-problems": "Recently solved problems",
    contests: "Contests attended (last 7 days)",
};

export function isPublicWidget(value: string): value is PublicWidget {
    return (PUBLIC_WIDGETS as readonly string[]).includes(value);
}

/** 3–30 chars, lowercase letters, digits and hyphens, no leading/trailing hyphen. */
export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

/** Handles that would be confusing or could impersonate the service. */
const RESERVED_HANDLES = new Set([
    "admin", "administrator", "api", "app", "dashboard", "docs", "help", "me",
    "mod", "moderator", "null", "public", "root", "settings", "staff", "support",
    "system", "undefined", "user", "users", "www", "dsa-mentor", "algomentor",
]);

/** Lowercases and trims a handle; does not validate it. */
export function normalizeHandle(raw: string): string {
    return raw.trim().toLowerCase();
}

/** Returns an error message for an invalid handle, or null when it's usable. */
export function validateHandle(handle: string): string | null {
    if (!HANDLE_PATTERN.test(handle)) {
        return "Handles are 3–30 characters: lowercase letters, numbers and hyphens, not starting or ending with a hyphen.";
    }
    if (RESERVED_HANDLES.has(handle)) {
        return "That handle is reserved. Please pick another one.";
    }
    return null;
}
