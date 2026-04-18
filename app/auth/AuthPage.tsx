"use client";

import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import { FormEvent, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getBrowserClient } from "@/app/lib/supabase/browser-client";
import { useRouter } from "next/navigation";

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

export default function AuthPage({ user }: EmailPassword) {
    const router = useRouter();
    const [isRegisterMode, setIsRegisterMode] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [name, setName] = useState("");

    const [status, setStatus] = useState("");

    const supabase = getBrowserClient()

    async function handleSubmit (e: FormEvent<HTMLFormElement>){
        e.preventDefault()

        if(isRegisterMode) {
            if (password !== confirmPass) {
                setStatus("Passwords do not match");
                return;
            }
            try{
                const { data, error } = await supabase.auth.signUp({
                    email, password, options: { data: { name } }
                }); 


                if(error)
                    setStatus(error.message);
                else{
                    setStatus("Check ur email to verify !!")
                    setEmail("");
                    setPassword("");
                    setConfirmPass("");
                    setName("");
                }
                console.log(data);
            }
            catch(err){
                console.log(err);
                throw new Error(`Error signing up ${err}`)
            }
            
        }
        else{
            try{
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                console.log(data);

                if(error)
                    setStatus(error.message);
                else{
                    setStatus("Logged in sucessfully!!")
                    router.push("/dashboard")
                }
            }
            catch(err){
                console.log(err);
                throw new Error(`Error signing in ${err}`)
            }
        }
    }

    async function handleGoogleLogin() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${location.origin}/auth/callback`
            }
        });

        if (error) {
            setStatus(error.message);
            return;
        }
    }

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
                        onClick={() => setIsRegisterMode((current) => !current)}
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

                                <button className="auth-cta" type="submit">
                                    Login
                                </button>

                                <button className="google-cta" type="button" onClick={handleGoogleLogin}>
                                    <span className="google-mark" aria-hidden>
                                        G
                                    </span>
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

                                <button className="auth-cta" type="submit">
                                    Register
                                </button>
                            </form>
                            <h1> status </h1>
                        </article>
                    </div>
                </div>
            </section>
        </main>
    );
}
