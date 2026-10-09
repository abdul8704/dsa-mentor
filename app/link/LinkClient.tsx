"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    approveWidgetLink,
    denyWidgetLink,
    getLinkRequest,
    type LinkRequestInfo,
} from "@/app/actions/widget.actions";

type Phase = "loading" | "confirm" | "connected" | "denied" | "error";

export default function LinkClient({ code }: { code: string }) {
    const router = useRouter();
    const [phase, setPhase] = useState<Phase>("loading");
    const [request, setRequest] = useState<LinkRequestInfo | null>(null);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getLinkRequest(code).then((res) => {
            if (cancelled) return;
            if (res.ok) {
                setRequest(res.request);
                setPhase("confirm");
            } else {
                setMessage(res.error);
                setPhase("error");
            }
        });
        return () => {
            cancelled = true;
        };
    }, [code]);

    useEffect(() => {
        if (phase !== "connected") return;
        const t = setTimeout(() => router.push("/dashboard"), 2500);
        return () => clearTimeout(t);
    }, [phase, router]);

    async function decide(approve: boolean) {
        if (busy) return;
        setBusy(true);
        const res = await (approve ? approveWidgetLink(code) : denyWidgetLink(code));
        setBusy(false);
        if (res.ok) {
            setPhase(approve ? "connected" : "denied");
        } else {
            setMessage(res.error);
            setPhase("error");
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-4 bg-[#131315] text-[#e5e1e4]">
            <div className="glass-card rounded-xl p-8 w-full max-w-md flex flex-col gap-5 text-center">
                {phase === "loading" && <p className="text-[14px] opacity-80">Checking code…</p>}

                {phase === "confirm" && request && (
                    <>
                        <h1 className="text-[20px] font-semibold">Connect {request.deviceName}?</h1>
                        <p className="text-[13px] text-[#a78b82] leading-relaxed">
                            This lets the widget read your solved counts, streak data and platform totals. It cannot change
                            anything. Only approve if the code below matches the one shown in your widget.
                        </p>
                        <div className="text-[28px] font-mono tracking-[0.2em] py-3 rounded-lg bg-black/30">
                            {request.userCode}
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void decide(false)}
                                className="px-5 py-2 rounded-lg border border-white/15 text-[14px] disabled:opacity-50"
                            >
                                Deny
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void decide(true)}
                                className="px-5 py-2 rounded-lg bg-[#ffb59d] text-[#2a0f06] font-semibold text-[14px] disabled:opacity-50"
                            >
                                {busy ? "Connecting…" : "Allow"}
                            </button>
                        </div>
                        <p className="text-[12px] text-[#a78b82]">You can disconnect it any time in Settings.</p>
                    </>
                )}

                {phase === "connected" && (
                    <>
                        <div className="text-[40px]">✓</div>
                        <h1 className="text-[20px] font-semibold">Widget connected</h1>
                        <p className="text-[13px] text-[#a78b82]">You can go back to the widget. Taking you to your dashboard…</p>
                    </>
                )}

                {phase === "denied" && (
                    <>
                        <h1 className="text-[20px] font-semibold">Request denied</h1>
                        <p className="text-[13px] text-[#a78b82]">The widget was not connected.</p>
                    </>
                )}

                {phase === "error" && (
                    <>
                        <h1 className="text-[20px] font-semibold">Can&apos;t connect</h1>
                        <p className="text-[13px] text-[#a78b82]">{message}</p>
                    </>
                )}
            </div>
        </main>
    );
}
