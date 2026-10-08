"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface ConnectLeetcodeFormProps {
  userId: string;
}

type ImportState = {
  state: "running" | "done" | "failed";
  phase: string;
  pages: number;
  acceptedSeen: number;
  summary: { distinctProblems: number; targetProblems: number | null; insertedRows: number } | null;
  error: string | null;
} | null;

type LeetcodeStatus =
  | { loading: true }
  | {
      loading: false;
      connected: boolean;
      status?: "active" | "needs_reauth" | "expired";
      import: ImportState;
    };

const INPUT_CLASS =
  "w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-[13px] text-[#e5e1e4] placeholder:text-[#6f645d] focus:outline-none focus:border-[rgba(255,181,157,0.5)] focus:ring-2 focus:ring-[rgba(255,181,157,0.15)] transition-colors [color-scheme:dark]";

/**
 * "Connect LeetCode" on the Settings page (/onboarding?edit=1).
 *
 * LeetCode's public API only shows ~20 recent submissions. With the user's
 * own session keys (LEETCODE_SESSION + csrftoken cookies) the worker reads
 * their whole history — every connect / re-import runs a full import and then
 * rebuilds every dashboard table (heatmap, daily counts, difficulty, streak).
 * Keys are encrypted at rest by the worker and never sent back.
 */
export default function ConnectLeetcodeForm({ userId }: ConnectLeetcodeFormProps) {
  const router = useRouter();
  const [sessionKey, setSessionKey] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [status, setStatus] = useState<LeetcodeStatus>({ loading: true });
  const wasRunning = useRef(false);

  const fetchStatus = useCallback(async (): Promise<LeetcodeStatus> => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/leetcode/status`, {
        params: { user_id: userId },
        timeout: 15_000,
      });
      return { loading: false, connected: Boolean(res.data?.connected), status: res.data?.status, import: res.data?.import ?? null };
    } catch {
      return { loading: false, connected: false, import: null };
    }
  }, [userId]);

  const loadStatus = useCallback(async () => {
    setStatus(await fetchStatus());
  }, [fetchStatus]);

  useEffect(() => {
    let cancelled = false;
    void fetchStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchStatus]);

  // Poll while an import is running; refresh the page's data when it ends.
  const importState = !status.loading ? status.import : null;
  const isImporting = importState?.state === "running";

  useEffect(() => {
    if (isImporting) {
      wasRunning.current = true;
      const timer = setInterval(() => void loadStatus(), 3_000);
      return () => clearInterval(timer);
    }
    if (wasRunning.current) {
      wasRunning.current = false;
      router.refresh();
    }
  }, [isImporting, loadStatus, router]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting || !sessionKey.trim() || !csrfToken.trim()) return;

    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/leetcode/connect`,
        { user_id: userId, session: sessionKey.trim(), csrftoken: csrfToken.trim() },
        { timeout: 45_000 }
      );
      setMessage({
        tone: "success",
        text: `Connected as ${res.data?.username ?? "your account"}. Importing your full history — this can take a few minutes.`,
      });
      setSessionKey("");
      setCsrfToken("");
      await loadStatus();
    } catch (err) {
      const text =
        (axios.isAxiosError(err) && (err.response?.data?.error as string | undefined)) ||
        "Couldn't connect with those keys. Double-check both values and try again.";
      setMessage({ tone: "error", text });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResync() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URL}/leetcode/resync`, { user_id: userId }, { timeout: 30_000 });
      await loadStatus();
    } catch (err) {
      const text =
        (axios.isAxiosError(err) && (err.response?.data?.error as string | undefined)) || "Couldn't start the re-import.";
      setMessage({ tone: "error", text });
    } finally {
      setIsSubmitting(false);
    }
  }

  const connected = !status.loading && status.connected;
  const active = connected && status.status === "active";

  return (
    <div className="glass-card rounded-xl p-6 lg:p-8 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-[#ffb59d]">code</span>
        <h3 className="text-[18px] font-semibold text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-sans)" }}>
          Connect LeetCode
        </h3>
      </div>

      {connected && (
        <div className="flex items-center gap-2 text-[13px]">
          <span className={`w-2 h-2 rounded-full ${active ? "bg-[#4edea3]" : "bg-[#ffb700]"}`} />
          <span className="text-[#dfc0b6]">
            {active ? "Connected — full history syncing." : "Your LeetCode session has expired — paste fresh keys below."}
          </span>
        </div>
      )}

      {importState && (
        <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-[12px] text-[#dfc0b6]">
          {importState.state === "running" && (
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              {importState.phase} — {importState.acceptedSeen} accepted submissions read ({importState.pages} pages)
            </span>
          )}
          {importState.state === "done" && importState.summary && (
            <span>
              Import complete: {importState.summary.distinctProblems}
              {importState.summary.targetProblems !== null ? ` / ${importState.summary.targetProblems}` : ""} problems,{" "}
              {importState.summary.insertedRows} new records. Dashboard refreshed.
            </span>
          )}
          {importState.state === "failed" && <span className="text-[#ff8a8a]">Import failed: {importState.error}</span>}
        </div>
      )}

      <p className="text-[13px] text-[#a78b82] leading-relaxed">
        LeetCode only shows your last ~20 submissions publicly. Add your session keys to import every problem
        you&apos;ve ever solved. Each connect or re-import refreshes all your stats.
      </p>

      <form onSubmit={(e) => void handleConnect(e)} className="flex flex-col gap-2">
        <label htmlFor="lc-session" className="text-[11px] uppercase tracking-[0.05em] text-[#a78b82]">
          LEETCODE_SESSION
        </label>
        <input
          id="lc-session"
          type="password"
          autoComplete="off"
          value={sessionKey}
          onChange={(e) => setSessionKey(e.target.value)}
          placeholder="Paste the LEETCODE_SESSION cookie value"
          className={INPUT_CLASS}
        />

        <label htmlFor="lc-csrf" className="mt-1 text-[11px] uppercase tracking-[0.05em] text-[#a78b82]">
          csrftoken
        </label>
        <input
          id="lc-csrf"
          type="password"
          autoComplete="off"
          value={csrfToken}
          onChange={(e) => setCsrfToken(e.target.value)}
          placeholder="Paste the csrftoken cookie value"
          className={INPUT_CLASS}
        />

        <p className="text-[11px] text-[#a78b82] leading-relaxed">
          How to get them: sign in at leetcode.com, open dev tools (F12), go to Application (Chrome/Edge) or
          Storage (Firefox) → Cookies → https://leetcode.com, and copy the values of{" "}
          <code className="text-[#dfc0b6]">LEETCODE_SESSION</code> and <code className="text-[#dfc0b6]">csrftoken</code>.
          They expire after a few weeks — paste fresh ones here when asked. Stored encrypted; never shown again.
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitting || isImporting || !sessionKey.trim() || !csrfToken.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[14px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[18px] ${isSubmitting ? "animate-spin" : ""}`}>
              {isSubmitting ? "progress_activity" : "link"}
            </span>
            <span>{isSubmitting ? "Connecting…" : connected ? "Update keys & re-import" : "Connect & import"}</span>
          </button>

          {active && (
            <button
              type="button"
              onClick={() => void handleResync()}
              disabled={isSubmitting || isImporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-[#dfc0b6] text-[14px] font-semibold hover:bg-white/5 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
              <span>Re-import history</span>
            </button>
          )}
        </div>
      </form>

      {message && (
        <p className={`text-[12px] ${message.tone === "success" ? "text-[#4edea3]" : "text-[#ff8a8a]"}`}>{message.text}</p>
      )}
    </div>
  );
}
