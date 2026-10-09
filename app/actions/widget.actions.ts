"use server";

import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { getServiceRoleClient } from "@/app/lib/supabase/service-client";
import { requireUser } from "@/app/lib/mentorship/access";
import { normalizeUserCode } from "@/app/lib/widget-api/tokens";

/**
 * Account side of the widget pairing flow, plus the "Connected widgets"
 * settings list. The user id always comes from the session, never the caller.
 * Link codes are only reachable through the service-role client, after
 * `requireUser` has passed.
 */

export interface LinkRequestInfo {
    userCode: string;
    deviceName: string;
}

export type LinkRequestResult = { ok: true; request: LinkRequestInfo } | { ok: false; error: string };
export type LinkDecisionResult = { ok: true } | { ok: false; error: string };

const INVALID = "This code is invalid or has expired. Click Connect in the widget to get a new one.";

export async function getLinkRequest(rawCode: string): Promise<LinkRequestResult> {
    try {
        await requireUser();
    } catch {
        return { ok: false, error: "Please sign in again." };
    }
    const userCode = normalizeUserCode(String(rawCode ?? ""));
    const { data } = await getServiceRoleClient()
        .from("widget_link_codes")
        .select("user_code, device_name, status, expires_at")
        .eq("user_code", userCode)
        .maybeSingle();

    if (!data || data.status !== "pending" || new Date(data.expires_at).getTime() < Date.now()) {
        return { ok: false, error: INVALID };
    }
    return { ok: true, request: { userCode: data.user_code, deviceName: data.device_name } };
}

async function decide(rawCode: string, status: "approved" | "denied"): Promise<LinkDecisionResult> {
    let me;
    try {
        me = await requireUser();
    } catch {
        return { ok: false, error: "Please sign in again." };
    }
    const { data, error } = await getServiceRoleClient()
        .from("widget_link_codes")
        .update({ status, user_id: me.id })
        .eq("user_code", normalizeUserCode(String(rawCode ?? "")))
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .select("id")
        .maybeSingle();

    if (error) {
        console.error(`[widget] ${status} failed for ${me.id}: ${error.message}`);
        return { ok: false, error: "Something went wrong. Please try again." };
    }
    if (!data) return { ok: false, error: INVALID };
    return { ok: true };
}

export async function approveWidgetLink(code: string): Promise<LinkDecisionResult> {
    return decide(code, "approved");
}

export async function denyWidgetLink(code: string): Promise<LinkDecisionResult> {
    return decide(code, "denied");
}

export interface ConnectedWidget {
    id: string;
    deviceName: string;
    createdAt: string;
    lastUsedAt: string | null;
}

export async function listMyWidgets(): Promise<ConnectedWidget[]> {
    const supabase = await createSupabaseServerClient();
    const me = await requireUser(supabase);
    const { data, error } = await supabase
        .from("widget_tokens")
        .select("id, device_name, created_at, last_used_at")
        .eq("user_id", me.id)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
    if (error) {
        console.error(`[widget] list failed for ${me.id}: ${error.message}`);
        return [];
    }
    return (data ?? []).map((r) => ({
        id: r.id,
        deviceName: r.device_name,
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at,
    }));
}

export async function revokeMyWidget(id: string): Promise<LinkDecisionResult> {
    const supabase = await createSupabaseServerClient();
    const me = await requireUser(supabase);
    const { error } = await supabase
        .from("widget_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", String(id))
        .eq("user_id", me.id);
    if (error) return { ok: false, error: "Could not disconnect that widget." };
    return { ok: true };
}
