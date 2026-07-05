"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { respondToInvite } from "@/app/actions/mentorship.actions";

interface InviteResponseProps {
    token: string;
    mentorName: string;
    status: string | null;
    notFound: boolean;
    isExpired: boolean;
    isLoggedIn: boolean;
    emailMatches: boolean;
    inviteeEmail: string | null;
}

/**
 * Client UI for responding to a mentorship invite. Handles every branch:
 * not-found / expired / already-responded / logged-out / wrong-account /
 * ready-to-respond. Mutations go through the respondToInvite server action.
 */
export default function InviteResponse({
    token,
    mentorName,
    status,
    notFound,
    isExpired,
    isLoggedIn,
    emailMatches,
    inviteeEmail,
}: InviteResponseProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState<"accept" | "decline" | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    async function respond(accept: boolean) {
        if (submitting) return;
        setSubmitting(accept ? "accept" : "decline");
        setMessage(null);

        try {
            const result = await respondToInvite(token, accept);
            setMessage(result.message);
            if (result.success) {
                setDone(true);
                if (accept) {
                    // Give the user a beat to read the confirmation, then route in.
                    setTimeout(() => router.push("/dashboard/tasks"), 1200);
                }
            }
        } catch {
            setMessage("Something went wrong. Please try again.");
        } finally {
            setSubmitting(null);
        }
    }

    // Choose the body based on invite state.
    const renderBody = () => {
        if (notFound) {
            return <StatusNote icon="link_off" text="This invitation link is invalid or no longer exists." />;
        }
        if (status && status !== "pending") {
            return <StatusNote icon="info" text={`This invitation was already ${status}.`} />;
        }
        if (isExpired) {
            return <StatusNote icon="schedule" text="This invitation has expired. Ask your mentor to send a new one." />;
        }
        if (!isLoggedIn) {
            return (
                <div className="flex flex-col gap-4">
                    <StatusNote
                        icon="lock"
                        text={
                            inviteeEmail
                                ? `Log in or sign up with ${inviteeEmail} to accept this invitation.`
                                : "Log in or sign up to accept this invitation."
                        }
                    />
                    <Link
                        href={`/auth?redirect=${encodeURIComponent(`/invite/${token}`)}`}
                        className="auth-cta inline-flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">login</span>
                        Log in to continue
                    </Link>
                </div>
            );
        }
        if (!emailMatches) {
            return (
                <StatusNote
                    icon="person_off"
                    text={`This invitation was sent to ${inviteeEmail ?? "a different address"}. Log in with that account to accept.`}
                />
            );
        }
        if (done) {
            return <StatusNote icon="check_circle" text={message ?? "Done."} accent />;
        }

        // Ready to respond.
        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={() => void respond(true)}
                        disabled={submitting !== null}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#f47144] text-[#5d1800] font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
                    >
                        <span className={`material-symbols-outlined ${submitting === "accept" ? "animate-spin" : ""}`}>
                            {submitting === "accept" ? "progress_activity" : "check"}
                        </span>
                        Accept invitation
                    </button>
                    <button
                        type="button"
                        onClick={() => void respond(false)}
                        disabled={submitting !== null}
                        className="inline-flex items-center justify-center gap-2 py-3 px-4 border border-white/10 text-[#dfc0b6] font-semibold rounded-lg hover:bg-white/5 hover:text-[#e5e1e4] active:scale-95 transition-all disabled:opacity-60"
                    >
                        Decline
                    </button>
                </div>
                {message && <p className="text-[13px] text-[#dfc0b6] opacity-80">{message}</p>}
            </div>
        );
    };

    return (
        <main className="auth-shell min-h-screen flex items-center justify-center px-4">
            <div className="auth-grid" />
            <div className="auth-spot auth-spot-left" />
            <div className="auth-spot auth-spot-right" />

            <section className="relative w-full max-w-[480px]">
                <div className="glass-card rounded-2xl p-8 animate-[dashboard-fade-in_0.4s_ease]">
                    <h1 className="text-[28px] font-bold tracking-tight text-[#ffb59d]" style={{ fontFamily: "var(--font-geist-sans)" }}>
                        AlgoMentor
                    </h1>
                    <p className="text-[12px] mt-1 mb-6 uppercase tracking-[0.05em] font-medium text-[#dfc0b6] opacity-70" style={{ fontFamily: "var(--font-geist-mono)" }}>
                        Mentorship Invitation
                    </p>

                    {!notFound && (
                        <p className="text-[16px] leading-relaxed text-[#e5e1e4] mb-6">
                            <span className="font-semibold text-[#ffb59d]">{mentorName}</span> has invited you to connect
                            as their mentee. They&apos;ll be able to view your progress and assign you problems to solve.
                        </p>
                    )}

                    {renderBody()}
                </div>
            </section>
        </main>
    );
}

/** Small inline status note with an icon, used for the non-actionable branches. */
function StatusNote({ icon, text, accent }: { icon: string; text: string; accent?: boolean }) {
    return (
        <div className={`flex items-start gap-3 rounded-lg p-4 ${accent ? "bg-[rgba(78,222,163,0.08)]" : "bg-white/5"}`}>
            <span className={`material-symbols-outlined ${accent ? "text-[#4edea3]" : "text-[#dfc0b6]"}`}>{icon}</span>
            <p className="text-[14px] text-[#e5e1e4] leading-relaxed">{text}</p>
        </div>
    );
}
