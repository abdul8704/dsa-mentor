"use client";

import { FormEvent, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getBrowserClient } from "@/app/lib/supabase/browser-client";
import { useRouter, useSearchParams } from "next/navigation";
import { POST_AUTH_COOKIE, safeInternalPath } from "@/app/lib/auth/redirect";
import Link from "next/link";
import Logo from "@/app/components/brand/Logo";
import { PLATFORM_ORDER, PlatformLogo, platformMeta } from "@/app/dashboard/components/ui/platforms";

const PITCH = [
    { icon: "sync", text: "LeetCode, Codeforces, AtCoder and CSES in one profile" },
    { icon: "local_fire_department", text: "Streaks, heatmaps and weekly trends that count every platform" },
    { icon: "supervisor_account", text: "Mentors see their whole cohort and assign problems" },
];

type EmailPassword = {
    user: User | null;
    error: Error | null;
}

/** Maps Supabase error messages to user-friendly messages */
function friendlyError(msg: string): string {
    const lower = msg.toLowerCase();
    if (lower.includes("invalid login credentials"))
        return "Incorrect email or password. Please try again.";
    if (lower.includes("email not confirmed"))
        return "Please verify your email before signing in.";
    if (lower.includes("user already registered") || lower.includes("already been registered"))
        return "An account with this email already exists. Try logging in instead.";
    if (lower.includes("signup is disabled"))
        return "New registrations are currently disabled.";
    if (lower.includes("rate limit") || lower.includes("too many requests"))
        return "Too many attempts. Please wait a moment and try again.";
    if (lower.includes("password") && lower.includes("at least"))
        return msg; // keep Supabase's specific password requirement message
    if (lower.includes("network") || lower.includes("fetch"))
        return "Network error. Please check your connection and try again.";
    return msg;
}

function GoogleLogo() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <path fill="none" d="M0 0h48v48H0z" />
        </svg>
    );
}

export default function AuthPage({ user }: EmailPassword) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isRegisterMode, setIsRegisterMode] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [name, setName] = useState("");

    const [status, setStatus] = useState("");
    const [statusType, setStatusType] = useState<"error" | "success" | "info">("info");
    const [isLoading, setIsLoading] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);

    const supabase = getBrowserClient()

    // Pick up error from query-string (e.g. from OAuth callback redirect)
    useEffect(() => {
        const errorParam = searchParams.get("error");
        if (errorParam) {
            setStatus(friendlyError(decodeURIComponent(errorParam)));
            setStatusType("error");
            // Clean the URL without reloading
            window.history.replaceState({}, "", "/auth");
        }
    }, [searchParams]);

    useEffect(() => {
        if (!showVerificationModal) {
            return;
        }

        const timer = window.setTimeout(() => {
            setShowVerificationModal(false);
            setIsRegisterMode(false);
            router.push("/auth");
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [showVerificationModal, router]);

    function clearStatus() {
        setStatus("");
        setStatusType("info");
    }

    async function handleSubmit (e: FormEvent<HTMLFormElement>){
        e.preventDefault()
        clearStatus();
        setIsLoading(true);

        if(isRegisterMode) {
            if (password !== confirmPass) {
                setStatus("Passwords do not match.");
                setStatusType("error");
                setIsLoading(false);
                return;
            }
            if (password.length < 6) {
                setStatus("Password must be at least 6 characters.");
                setStatusType("error");
                setIsLoading(false);
                return;
            }
            try{
                const { data, error } = await supabase.auth.signUp({
                    email, password, options: { data: { name } }
                }); 

                if(error) {
                    setStatus(friendlyError(error.message));
                    setStatusType("error");
                } else {
                    // Supabase can return a user with a fake session if the email
                    // already exists but isn't confirmed. Check for that:
                    if (data.user && data.user.identities && data.user.identities.length === 0) {
                        setStatus("An account with this email already exists. Try logging in instead.");
                        setStatusType("error");
                    } else {
                        await supabase.auth.signOut();
                        setEmail("");
                        setPassword("");
                        setConfirmPass("");
                        setName("");
                        clearStatus();
                        setShowVerificationModal(true);
                    }
                }
            }
            catch(err) {
                console.error("Sign-up error:", err);
                setStatus("Something went wrong. Please try again.");
                setStatusType("error");
            }
            
        }
        else{
            try{
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if(error) {
                    setStatus(friendlyError(error.message));
                    setStatusType("error");
                } else {
                    setStatus("Logged in successfully!");
                    setStatusType("success");
                    // Honor a safe internal ?redirect= target (e.g. an invite link)
                    // so users who arrive via an invite land back on it after login.
                    router.push(safeInternalPath(searchParams.get("redirect")) ?? "/dashboard");
                }
            }
            catch(err) {
                console.error("Sign-in error:", err);
                setStatus("Something went wrong. Please try again.");
                setStatusType("error");
            }
        }

        setIsLoading(false);
    }

    async function handleGoogleLogin() {
        clearStatus();
        setIsLoading(true);
        try {
            // OAuth leaves the site, so keep the post-login target in a short-lived
            // cookie that /auth/callback reads (a query param on redirectTo would
            // have to be allow-listed in Supabase).
            const target = safeInternalPath(searchParams.get("redirect"));
            if (target) document.cookie = `${POST_AUTH_COOKIE}=${encodeURIComponent(target)}; path=/; max-age=600; SameSite=Lax`;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${location.origin}/auth/callback`
                }
            });

            if (error) {
                setStatus(friendlyError(error.message));
                setStatusType("error");
                setIsLoading(false);
            }
            // If no error, browser navigates to Google — no need to setIsLoading(false)
        } catch (err) {
            console.error("Google login error:", err);
            setStatus("Could not connect to Google. Please try again.");
            setStatusType("error");
            setIsLoading(false);
        }
    }

    function switchMode(register: boolean) {
        if (register === isRegisterMode) return;
        setIsRegisterMode(register);
        clearStatus();
    }

    const statusBanner = status ? (
        <div
            role="alert"
            className="flex items-start gap-2 rounded-[var(--dash-r-md)] px-3 py-2.5 text-[13px] dash-anim-rise"
            style={{
                background:
                    statusType === "error"
                        ? "var(--dash-feedback-danger-wash)"
                        : statusType === "success"
                          ? "var(--dash-feedback-success-wash)"
                          : "var(--dash-surface-sunken)",
                color:
                    statusType === "error"
                        ? "var(--dash-feedback-danger)"
                        : statusType === "success"
                          ? "var(--dash-feedback-success)"
                          : "var(--dash-content-secondary)",
            }}
        >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {statusType === "error" ? "error" : statusType === "success" ? "check_circle" : "info"}
            </span>
            <span>{status}</span>
        </div>
    ) : null;

    const verificationModal = showVerificationModal ? (
        <div className="dash-portal" role="presentation">
            <div className="dash-modal" role="dialog" aria-modal="true" aria-labelledby="verification-modal-title">
                <div className="dash-modal-icon" aria-hidden>
                    <span className="material-symbols-outlined">mark_email_read</span>
                </div>
                <h2 id="verification-modal-title" className="text-lg font-bold text-[color:var(--dash-content-primary)]">
                    Check your email
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--dash-content-secondary)]">
                    We sent you a verification link. Click it to activate your account, then log in.
                </p>
                <p className="mt-3 text-xs text-[color:var(--dash-content-tertiary)]">Returning to login in 5 seconds…</p>
            </div>
        </div>
    ) : null;

    return (
        <main className="dashboard-shell grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-mode={isRegisterMode ? "register" : "login"}>
            {verificationModal}

            {/* Brand panel (wide screens) */}
            <aside
                className="relative hidden lg:flex flex-col justify-between gap-10 p-12 border-r border-[color:var(--dash-border-subtle)] overflow-hidden"
                style={{ background: "var(--dash-grad-hero), var(--dash-surface-raised)" }}
            >
                <Link href="/" className="self-start">
                    <Logo size={38} glow textSize={17} />
                </Link>
                <div className="flex flex-col gap-6 max-w-[460px]">
                    <h2 className="text-[clamp(1.8rem,2.8vw,2.6rem)] font-extrabold leading-[1.1] tracking-[-0.03em]">
                        Every solve, streak and rating in{" "}
                        <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--dash-grad-accent)" }}>
                            one place
                        </span>
                    </h2>
                    <ul className="flex flex-col gap-3.5">
                        {PITCH.map((p, i) => (
                            <li key={p.icon} className="flex items-center gap-3 dash-anim-rise" style={{ animationDelay: `${100 + i * 80}ms` }}>
                                <span className="grid place-items-center w-9 h-9 flex-none rounded-[var(--dash-r-md)] bg-[color:var(--dash-accent-wash)] text-[color:var(--dash-accent-soft)]" aria-hidden="true">
                                    <span className="material-symbols-outlined text-[20px]">{p.icon}</span>
                                </span>
                                <span className="text-[14px] text-[color:var(--dash-content-secondary)]">{p.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-semibold text-[color:var(--dash-content-tertiary)]">
                    {PLATFORM_ORDER.map((k) => (
                        <span key={k} className="inline-flex items-center gap-2">
                            <PlatformLogo platform={k} size={16} />
                            {platformMeta(k).name}
                        </span>
                    ))}
                </div>
            </aside>

            {/* Form */}
            <section className="relative flex flex-col items-center justify-center px-4 py-10 min-h-screen">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[360px] lg:hidden" style={{ background: "var(--dash-grad-hero)" }} />
                <div className="relative w-full max-w-[420px] flex flex-col gap-6">
                    <Link href="/" className="self-center lg:hidden">
                        <Logo size={36} glow />
                    </Link>

                    <header className="flex flex-col gap-1.5 text-center lg:text-left">
                        <h1 className="text-[clamp(1.6rem,3vw,2rem)] font-bold tracking-[-0.02em]">
                            {isRegisterMode ? "Create your account" : "Welcome back"}
                        </h1>
                        <p className="text-sm text-[color:var(--dash-content-secondary)]">
                            {isRegisterMode ? "Start tracking your practice in under a minute." : "Log in to pick up where you left off."}
                        </p>
                    </header>

                    <div className="dash-card dash-spot !p-6 !gap-5">
                        <div className="dash-seg w-full !grid grid-cols-2" role="tablist" aria-label="Log in or register">
                            <button type="button" role="tab" aria-selected={!isRegisterMode} onClick={() => switchMode(false)} className="justify-center !min-h-[36px]">
                                Log in
                            </button>
                            <button type="button" role="tab" aria-selected={isRegisterMode} onClick={() => switchMode(true)} className="justify-center !min-h-[36px]">
                                Register
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="dash-btn dash-btn-ghost w-full !min-h-[44px] !font-semibold"
                        >
                            <GoogleLogo />
                            {isRegisterMode ? "Sign up with Google" : "Continue with Google"}
                        </button>

                        <div className="flex items-center gap-3 text-[11px] text-[color:var(--dash-content-tertiary)]" aria-hidden="true">
                            <i className="flex-1 h-px bg-[color:var(--dash-border-subtle)]" />
                            or with email
                            <i className="flex-1 h-px bg-[color:var(--dash-border-subtle)]" />
                        </div>

                        {statusBanner}

                        <form key={isRegisterMode ? "register" : "login"} className="flex flex-col gap-4 dash-anim-rise" onSubmit={handleSubmit}>
                            {isRegisterMode && (
                                <div>
                                    <label className="dash-field-label" htmlFor="register-name">
                                        Name
                                    </label>
                                    <input
                                        className="dash-input"
                                        id="register-name"
                                        type="text"
                                        name="name"
                                        autoComplete="name"
                                        placeholder="Your name"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="dash-field-label" htmlFor="auth-email">
                                    Email
                                </label>
                                <input
                                    className="dash-input"
                                    id="auth-email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    inputMode="email"
                                    placeholder="you@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="dash-field-label" htmlFor="auth-password">
                                    Password
                                </label>
                                <input
                                    className="dash-input"
                                    id="auth-password"
                                    type="password"
                                    name="password"
                                    autoComplete={isRegisterMode ? "new-password" : "current-password"}
                                    placeholder={isRegisterMode ? "At least 6 characters" : "Your password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            {isRegisterMode && (
                                <div>
                                    <label className="dash-field-label" htmlFor="register-confirm-password">
                                        Confirm password
                                    </label>
                                    <input
                                        className="dash-input"
                                        id="register-confirm-password"
                                        type="password"
                                        name="confirmPassword"
                                        autoComplete="new-password"
                                        placeholder="Repeat password"
                                        required
                                        value={confirmPass}
                                        onChange={(e) => setConfirmPass(e.target.value)}
                                    />
                                </div>
                            )}

                            <button className="dash-btn dash-btn-primary w-full !min-h-[44px] !text-[14px] mt-1" type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <span className="dash-spinner" aria-hidden="true" />
                                        {isRegisterMode ? "Creating account…" : "Logging in…"}
                                    </>
                                ) : isRegisterMode ? (
                                    "Create account"
                                ) : (
                                    "Log in"
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="text-center text-[13px] text-[color:var(--dash-content-tertiary)]">
                        {isRegisterMode ? "Already have an account? " : "New to AlgoMentor? "}
                        <button
                            type="button"
                            onClick={() => switchMode(!isRegisterMode)}
                            className="font-semibold text-[color:var(--dash-accent-soft)] hover:underline"
                        >
                            {isRegisterMode ? "Log in" : "Create an account"}
                        </button>
                    </p>
                </div>
            </section>
        </main>
    );
}
