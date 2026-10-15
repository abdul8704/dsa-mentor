"use client";

import { useEffect, useState } from "react";
import { getMyPublicProfile, savePublicProfile } from "@/app/actions/publicProfile.actions";
import {
  PUBLIC_WIDGETS,
  PUBLIC_WIDGET_LABELS,
  normalizeHandle,
  validateHandle,
  type PublicWidget,
} from "@/app/lib/public-api/widgets";

/**
 * Settings card for the opt-in public API: a master switch, the public
 * handle used in API URLs, and which dashboard widgets are exposed.
 * Everything is off until the user saves with the switch on.
 */
export default function PublicApiSettings() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [handle, setHandle] = useState("");
  const [widgets, setWidgets] = useState<PublicWidget[]>([...PUBLIC_WIDGETS]);
  const [savedHandle, setSavedHandle] = useState<string | null>(null);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    let cancelled = false;
    getMyPublicProfile()
      .then((settings) => {
        if (cancelled || !settings) return;
        setEnabled(settings.enabled);
        setHandle(settings.handle);
        setWidgets(settings.widgets);
        setSavedHandle(settings.handle);
        setSavedEnabled(settings.enabled);
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        setOrigin(window.location.origin);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleWidget(widget: PublicWidget) {
    setWidgets((current) => (current.includes(widget) ? current.filter((w) => w !== widget) : [...current, widget]));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;

    const normalized = normalizeHandle(handle);
    const handleError = validateHandle(normalized);
    if (handleError) {
      setMessage({ tone: "error", text: handleError });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const result = await savePublicProfile({ enabled, handle: normalized, widgets });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setHandle(result.settings.handle);
      setSavedHandle(result.settings.handle);
      setSavedEnabled(result.settings.enabled);
      setMessage({
        tone: "success",
        text: result.settings.enabled
          ? "Saved. Your public page and API are live; cached copies can take up to 5 minutes to update."
          : "Saved. Your public page and API are off; cached copies can take up to 5 minutes to expire.",
      });
    } catch {
      setMessage({ tone: "error", text: "Couldn't save your settings. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  const apiBase = savedHandle ? `${origin}/api/public/v1/users/${savedHandle}` : null;
  const pageUrl = savedHandle ? `${origin}/users/${savedHandle}` : null;

  return (
    <div className="glass-card rounded-xl p-6 lg:p-8 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-[color:var(--dash-accent-soft)]">api</span>
        <h3 className="text-[18px] font-semibold text-[color:var(--dash-content-primary)]" style={{ fontFamily: "var(--font-geist-sans)" }}>
          Public profile &amp; API
        </h3>
      </div>

      <p className="text-[13px] text-[color:var(--dash-content-tertiary)] leading-relaxed">
        Turn this on to share the dashboard widgets you choose below with anyone: as a public page at
        /users/&lt;your handle&gt; and through a read-only API for your portfolio. Only those widgets are shared.
        Your email, account id and connected-platform credentials are never exposed. Turn it off at any time.
      </p>

      {loading ? (
        <p className="text-[13px] text-[color:var(--dash-content-secondary)] opacity-80">Loading…</p>
      ) : (
        <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 accent-[color:var(--dash-accent-soft)]"
            />
            <span className="text-[14px] text-[color:var(--dash-content-primary)]">Make my selected widgets public</span>
          </label>

          <div className="flex flex-col gap-2">
            <label htmlFor="public-handle" className="text-[11px] uppercase tracking-[0.05em] text-[color:var(--dash-content-tertiary)]">
              Public handle
            </label>
            <input
              id="public-handle"
              type="text"
              autoComplete="off"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="e.g. aziz-codes"
              maxLength={30}
              className="w-full h-10 px-3 rounded-lg bg-[color:var(--dash-surface-sunken)] border border-[color:var(--dash-border-strong)] text-[13px] text-[color:var(--dash-content-primary)] placeholder:text-[color:var(--dash-content-tertiary)] focus:outline-none focus:border-[color:var(--dash-accent-line)] focus:ring-2 focus:ring-[color:var(--dash-accent-wash)] transition-colors [color-scheme:dark]"
            />
            <span className="text-[12px] text-[color:var(--dash-content-tertiary)]">3–30 characters: lowercase letters, numbers and hyphens.</span>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[11px] uppercase tracking-[0.05em] text-[color:var(--dash-content-tertiary)] mb-1">Shared widgets</legend>
            {PUBLIC_WIDGETS.map((widget) => (
              <label key={widget} className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={widgets.includes(widget)}
                  onChange={() => toggleWidget(widget)}
                  className="w-4 h-4 accent-[color:var(--dash-accent-soft)]"
                />
                <span className="text-[13px] text-[color:var(--dash-content-secondary)]">{PUBLIC_WIDGET_LABELS[widget]}</span>
              </label>
            ))}
          </fieldset>

          <button
            type="submit"
            disabled={isSaving || !handle.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[color:var(--dash-accent-line)] text-[color:var(--dash-accent-soft)] text-[14px] font-semibold hover:bg-[color:var(--dash-accent-wash)] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed self-start"
          >
            <span className={`material-symbols-outlined text-[18px] ${isSaving ? "animate-spin" : ""}`}>
              {isSaving ? "progress_activity" : "save"}
            </span>
            <span>{isSaving ? "Saving…" : "Save public settings"}</span>
          </button>
        </form>
      )}

      {message && (
        <p className={`text-[12px] ${message.tone === "success" ? "text-[color:var(--dash-feedback-success)]" : "text-[color:var(--dash-feedback-danger)]"}`}>{message.text}</p>
      )}

      {pageUrl && savedEnabled && (
        <div className="flex flex-col gap-1 text-[12px] text-[color:var(--dash-content-secondary)]">
          <span className="text-[11px] uppercase tracking-[0.05em] text-[color:var(--dash-content-tertiary)]">Your public page</span>
          <div className="flex flex-wrap items-center gap-2">
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[color:var(--dash-accent-soft)] hover:underline">
              {pageUrl}
            </a>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(pageUrl).then(() => setMessage({ tone: "success", text: "Link copied." }))}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[color:var(--dash-border-subtle)] text-[12px] text-[color:var(--dash-content-secondary)] hover:bg-[color:var(--dash-surface-sunken)]"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
              Copy
            </button>
          </div>
        </div>
      )}

      {apiBase && savedEnabled && (
        <div className="flex flex-col gap-1 text-[12px] text-[color:var(--dash-content-secondary)]">
          <span className="text-[11px] uppercase tracking-[0.05em] text-[color:var(--dash-content-tertiary)]">Your API</span>
          <code className="break-all">{apiBase}/dashboard</code>
          <span className="text-[color:var(--dash-content-tertiary)]">
            Every widget also has its own URL, e.g. <code>{apiBase}/heatmap</code>. Limit: 60 requests per minute per
            visitor IP.
          </span>
        </div>
      )}
    </div>
  );
}
