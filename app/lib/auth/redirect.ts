/**
 * Post-login redirect helpers, shared by the auth page (client) and the OAuth
 * callback (server), so this file must stay free of server-only imports.
 */

export const POST_AUTH_COOKIE = "post_auth_redirect";

/**
 * Returns `raw` only when it is a same-site absolute path ("/link?code=…").
 * Rejects "//host", "/\\host" and anything with a scheme, which browsers
 * would treat as an off-site redirect.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
    if (!raw || raw.length > 300) return null;
    if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
    if (/[\u0000-\u001f]/.test(raw)) return null;
    return raw;
}
