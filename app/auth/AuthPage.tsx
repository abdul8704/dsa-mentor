"use client";

import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import { FormEvent, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getBrowserClient } from "@/app/lib/supabase/browser-client";
import { useRouter, useSearchParams } from "next/navigation";

type EmailPassword = {
    user: User | null;
    error: Error | null;
}

const headingFont = Bricolage_Grotesque({
    subsets: ["latin"],
    weight: ["500", "700"],
});

const bodyFont = Space_Grotesk({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
});

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
                        setStatus("Account created! Check your email to verify.")
                        setStatusType("success");
                        setEmail("");
                        setPassword("");
                        setConfirmPass("");
                        setName("");
                        router.push("/onboarding")
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
                    setStatus("Logged in successfully!")
                    setStatusType("success");
                    router.push("/dashboard")
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

    const statusBanner = status ? (
        <div className={`auth-status auth-status-${statusType}`} role="alert">
            <span className="auth-status-icon" aria-hidden>
                {statusType === "error" ? "✕" : statusType === "success" ? "✓" : "ℹ"}
            </span>
            <span>{status}</span>
        </div>
    ) : null;

    return (
        <main
            className={`auth-shell ${bodyFont.className}`}
            data-mode={isRegisterMode ? "register" : "login"}
        >
            <div className="auth-grid" />
            <div className="auth-spot auth-spot-left" />
            <div className="auth-spot auth-spot-right" />

            <section className="auth-wrap">
                <header className="auth-header">
                    <p className="auth-kicker">DSA Mentor Access</p>
                    <h1 className={`${headingFont.className} auth-title`}>
                        {isRegisterMode ? "Create your account" : "Welcome back"}
                    </h1>

                    <button
                        type="button"
                        className="flip-toggle"
                        onClick={() => {
                            setIsRegisterMode((current) => !current);
                            clearStatus();
                        }}
                        aria-label={
                            isRegisterMode ? "Switch to login form" : "Switch to register form"
                        }
                    >
                        <span className="flip-toggle-icon" aria-hidden>
                            <span className="flip-toggle-front">Login</span>
                            <span className="flip-toggle-back">Register</span>
                        </span>
                        <span className="flip-toggle-text">
                            {isRegisterMode ? "Login" : "Register"}
                        </span>
                    </button>
                </header>

                <div className="auth-card-stage" aria-live="polite">
                    <div className="auth-card-3d">
                        <article className="auth-card-face auth-face-login" aria-hidden={isRegisterMode}>
                            <h2 className={`${headingFont.className} auth-face-title`}>Login</h2>
                            <p className="auth-face-copy">Continue where you left off.</p>

                            {!isRegisterMode && statusBanner}

                            <form className="auth-form" onSubmit={handleSubmit}>
                                <label className="auth-label" htmlFor="login-email">
                                    Email
                                </label>
                                <input
                                    className="auth-input"
                                    id="login-email"
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    required
                                    value={email}
                                    onChange = {(e) => setEmail(e.target.value)} 
                                />

                                <label className="auth-label" htmlFor="login-password">
                                    Password
                                </label>
                                <input
                                    className="auth-input"
                                    id="login-password"
                                    type="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    required
                                    value={password}
                                    onChange = {(e) => setPassword(e.target.value)} 

                                />

                                <button className="auth-cta" type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <span className="auth-btn-loading">
                                            <span className="auth-spinner" />
                                            Signing in…
                                        </span>
                                    ) : "Login"}
                                </button>

                                <button className="google-cta" type="button" onClick={handleGoogleLogin} disabled={isLoading}>
                                    <GoogleLogo />
                                    <span>Sign in with Google</span>
                                </button>
                            </form>
                        </article>

                        <article
                            className="auth-card-face auth-face-register"
                            aria-hidden={!isRegisterMode}
                        >
                            <h2 className={`${headingFont.className} auth-face-title`}>Register</h2>
                            <p className="auth-face-copy">Start your DSA streak today.</p>

                            {isRegisterMode && statusBanner}

                            <form className="auth-form" onSubmit={handleSubmit}>
                                <label className="auth-label" htmlFor="register-name">
                                    Name
                                </label>
                                <input
                                    className="auth-input"
                                    id="register-name"
                                    type="text"
                                    name="name"
                                    placeholder="Your name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />

                                <label className="auth-label" htmlFor="register-email">
                                    Email
                                </label>
                                <input
                                    className="auth-input"
                                    id="register-email"
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    required
                                    value={email}
                                    onChange = {(e) => setEmail(e.target.value)} 

                                />

                                <label className="auth-label" htmlFor="register-password">
                                    Password
                                </label>
                                <input
                                    className="auth-input"
                                    id="register-password"
                                    type="password"
                                    name="password"
                                    placeholder="Create a password"
                                    required
                                    value={password}
                                    onChange = {(e) => setPassword(e.target.value)} 

                                />

                                <label className="auth-label" htmlFor="register-confirm-password">
                                    Confirm password
                                </label>
                                <input
                                    className="auth-input"
                                    id="register-confirm-password"
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Repeat password"
                                    required
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value) }
                                />

                                <button className="auth-cta" type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <span className="auth-btn-loading">
                                            <span className="auth-spinner" />
                                            Creating account…
                                        </span>
                                    ) : "Register"}
                                </button>

                                <button className="google-cta" type="button" onClick={handleGoogleLogin} disabled={isLoading}>
                                    <GoogleLogo />
                                    <span>Sign up with Google</span>
                                </button>
                            </form>
                        </article>
                    </div>
                </div>
            </section>
        </main>
    );
}
