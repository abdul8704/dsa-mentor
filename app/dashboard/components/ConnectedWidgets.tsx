"use client";

import { useEffect, useState } from "react";
import { listMyWidgets, revokeMyWidget, type ConnectedWidget } from "@/app/actions/widget.actions";

/** Settings card listing desktop widgets linked to this account, with a revoke button. */
export default function ConnectedWidgets() {
  const [widgets, setWidgets] = useState<ConnectedWidget[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listMyWidgets()
      .then((rows) => !cancelled && setWidgets(rows))
      .catch(() => !cancelled && setWidgets([]));
    return () => {
      cancelled = true;
    };
  }, []);

  async function revoke(id: string) {
    setError("");
    const res = await revokeMyWidget(id);
    if (res.ok) setWidgets((cur) => (cur ?? []).filter((w) => w.id !== id));
    else setError(res.error);
  }

  return (
    <div className="glass-card rounded-xl p-6 lg:p-8 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-[#ffb59d]">widgets</span>
        <h3 className="text-[18px] font-semibold text-[#e5e1e4]" style={{ fontFamily: "var(--font-geist-sans)" }}>
          Connected widgets
        </h3>
      </div>
      <p className="text-[13px] text-[#a78b82] leading-relaxed">
        Desktop widgets linked to your account. To add one, click Connect AlgoMentor in the widget.
      </p>
      {widgets === null ? (
        <p className="text-[13px] text-[#dfc0b6] opacity-80">Loading…</p>
      ) : widgets.length === 0 ? (
        <p className="text-[13px] text-[#dfc0b6] opacity-80">No widgets connected.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {widgets.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 text-[13px] text-[#e5e1e4]">
              <span>
                {w.deviceName}
                <span className="block text-[11px] text-[#a78b82]">
                  Connected {new Date(w.createdAt).toLocaleDateString()}
                  {w.lastUsedAt ? ` · last used ${new Date(w.lastUsedAt).toLocaleString()}` : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void revoke(w.id)}
                className="px-3 py-1 rounded-lg border border-white/15 text-[12px]"
              >
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-[12px] text-red-400">{error}</p>}
    </div>
  );
}
