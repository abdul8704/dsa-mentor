"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface ConnectCsesFormProps {
  userId: string;
}

type CsesStatus =
  | { loading: true }
  | { loading: false; connected: false }
  | { loading: false; connected: true; status: "active" | "needs_reauth" | "expired"; lastVerifiedAt: string | null };

/**
 * Standalone "Connect CSES" widget — not yet wired into the onboarding flow
 * or a settings page (see CSES_INTEGRATION_PLAN.md's remaining manual
 * steps). Drop it wherever a mentee manages their connected platforms.
 *
 * Talks directly to the worker's POST /cses/connect and GET /cses/status,
 * matching ProfileCardClient.tsx's existing pattern for platform-refresh
 * calls (client -> NEXT_PUBLIC_SERVER_URL) rather than routing through a
 * Next.js server action — CSES needs the worker itself (to verify the
 * cookie, encrypt it, and run the import), so a server action here would
 * just be an extra hop with nothing to add.
 */
export default function ConnectCsesForm({ userId }: ConnectCsesFormProps) {
  const router = useRouter();
  const [cookie, setCookie] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [status, setStatus] = useState<CsesStatus>({ loading: true });

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/cses/status`, {
          params: { user_id: userId },
          timeout: 15_000,
        });
        if (cancelled) return;
        setStatus(res.data?.connected ? { loading: false, ...res.data } : { loading: false, connected: false });
      } catch {
        if (!cancelled) setStatus({ loading: false, connected: false });
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting || !cookie.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/cses/connect`,
        { user_id: userId, cookie: cookie.trim() },
        { timeout: 30_000 }
      );

      setMessage({
        tone: "success",
        text: res.data?.username
          ? `Connected as ${res.data.username}. Importing your solved problems now — this can take a few minutes.`
          : "Connected. Importing your solved problems now — this can take a few minutes.",
      });
      setCookie("");
      setStatus({ loading: false, connected: true, status: "active", lastVerifiedAt: new Date().toISOString() });
      router.refresh();
    } catch (err) {
      const text =
        (axios.isAxiosError(err) && (err.response?.data?.error as string | undefined)) ||
        "Couldn't connect that CSES session. Double-check the cookie value and try again.";
      setMessage({ tone: "error", text });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="glass-card rounded-xl p-6 lg:p-8 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-[#ffb59d]">school</span>
        <h3
          className="text-[18px] font-semibold text-[#e5e1e4]"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          Connect CSES
        </h3>
      </div>

      {!status.loading && status.connected && (
        <div className="flex items-center gap-2 text-[13px]">
          <span
            className={`w-2 h-2 rounded-full ${status.status === "active" ? "bg-[#4edea3]" : "bg-[#ffb700]"}`}
          />
          <span className="text-[#dfc0b6]">
            {status.status === "active"
              ? "Connected and syncing."
              : "Your CSES session has expired — paste a fresh cookie below to reconnect."}
          </span>
        </div>
      )}

      <p className="text-[13px] text-[#a78b82] leading-relaxed">
        CSES has no public API, so this reads your solved problems using your own logged-in session
        cookie. Open cses.fi, sign in, then copy the <code className="text-[#dfc0b6]">PHPSESSID</code>{" "}
        cookie value from your browser&apos;s dev tools (Application/Storage → Cookies). It&apos;s stored
        encrypted and never shown back to you.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-2">
        <label htmlFor="cses-cookie" className="text-[11px] uppercase tracking-[0.05em] text-[#a78b82]">
          PHPSESSID value
        </label>
        <input
          id="cses-cookie"
          type="password"
          autoComplete="off"
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          placeholder="Paste your CSES session cookie"
          className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-[13px] text-[#e5e1e4] placeholder:text-[#6f645d] focus:outline-none focus:border-[rgba(255,181,157,0.5)] focus:ring-2 focus:ring-[rgba(255,181,157,0.15)] transition-colors [color-scheme:dark]"
        />

        <button
          type="submit"
          disabled={isSubmitting || !cookie.trim()}
          className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[rgba(255,181,157,0.4)] text-[#ffb59d] text-[14px] font-semibold hover:bg-[rgba(255,181,157,0.08)] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed self-start"
        >
          <span className={`material-symbols-outlined text-[18px] ${isSubmitting ? "animate-spin" : ""}`}>
            {isSubmitting ? "progress_activity" : "link"}
          </span>
          <span>{isSubmitting ? "Connecting…" : status.loading || !status.connected ? "Connect account" : "Reconnect"}</span>
        </button>
      </form>

      {message && (
        <p className={`text-[12px] ${message.tone === "success" ? "text-[#4edea3]" : "text-[#ff8a8a]"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
