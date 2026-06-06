"use client";

import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import { FormEvent, useEffect, useState } from "react";
import { getBrowserClient } from "@/app/lib/supabase/browser-client";
import { addPlatformHandles } from "../actions/profile.actions";
import { useRouter } from "next/navigation";
import axios from "axios";

const headingFont = Bricolage_Grotesque({
    subsets: ["latin"],
    weight: ["500", "700"],
});

const bodyFont = Space_Grotesk({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
});

type PlatformKey =
    | "leetcode"
    | "codeforces"
    | "codechef"
    | "atcoder"
    | "hackerrank"
    | "github";

type FormState = Record<PlatformKey, string>;

const EMPTY_FORM_STATE: FormState = {
    leetcode: "",
    codeforces: "",
    codechef: "",
    atcoder: "",
    hackerrank: "",
    github: "",
};

function buildInitialFormState(platforms: { platform: string; handle: string }[] | null): FormState {
    const nextState: FormState = { ...EMPTY_FORM_STATE };

    platforms?.forEach(({ platform, handle }) => {
        if (platform in nextState) {
            nextState[platform as PlatformKey] = handle ?? "";
        }
    });

    return nextState;
}

const PLATFORM_FIELDS: Array<{
    key: PlatformKey;
    label: string;
    placeholder: string;
}> = [
    { key: "leetcode", label: "LeetCode", placeholder: "your_leetcode_username" },
    { key: "codeforces", label: "Codeforces", placeholder: "your_codeforces_handle" },
    { key: "codechef", label: "CodeChef", placeholder: "your_codechef_handle" },
    { key: "atcoder", label: "Atcoder", placeholder: "your_atcoder_handle" },
    { key: "hackerrank", label: "HackerRank", placeholder: "your_hackerrank_handle" },
    { key: "github", label: "GitHub", placeholder: "your_github_username" },
];

export default function OnboardingForm({platforms}: { platforms: { platform: string; handle: string }[] | null}) {
    const supabase = getBrowserClient();
    const router = useRouter();

    const [userId, setUserId] = useState("");
    const [formState, setFormState] = useState<FormState>(() => buildInitialFormState(platforms));
    const [status, setStatus] = useState("Ready to collect your platform handles.");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadUser() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!isMounted) {
                return;
            }

            setUserId(user?.id ?? "");
            setStatus(user?.id ? "Connected to your session." : "Session not found. Please log in again.");
        }

        void loadUser();

        return () => {
            isMounted = false;
        };
    }, [supabase]);

    useEffect(() => {
        setFormState(buildInitialFormState(platforms));
    }, [platforms]);

    function updateField(key: PlatformKey, value: string) {
        setFormState((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        if (!userId) {
            setStatus("Unable to read your session yet. Please wait a moment and try again.");
            return;
        }

        const nextPayload = PLATFORM_FIELDS
            .map(({ key }) => ({
                platform: key,
                handle: formState[key].trim(),
            }))
            .filter((entry) => entry.handle.length > 0);

        if (nextPayload.length === 0) {
            setStatus("Add at least one handle before submitting.");
            return;
        }

        setIsSubmitting(true);
        setStatus("Saving your platform handles...");

        try {
            await addPlatformHandles(userId, nextPayload);
            await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URL}/refresh/fresh-init`, { userId });
            setStatus("Platform handles saved successfully! Redirecting to dashboard...");
            router.push("/dashboard");
        } catch {
            setStatus("Could not save handles right now. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className={`auth-shell onboarding-shell ${bodyFont.className}`}>
            <div className="auth-grid" />
            <div className="auth-spot auth-spot-left" />
            <div className="auth-spot auth-spot-right" />

            <section className="auth-wrap onboarding-wrap">
                <header className="auth-header onboarding-header">
                    <p className="auth-kicker">DSA Mentor Setup</p>
                    <h1 className={`${headingFont.className} auth-title`}>
                        Connect your coding platforms
                    </h1>
                    <p className="auth-face-copy">
                        Add your handles once. We will use them to power your tracker, rankings,
                        and streaks.
                    </p>
                </header>

                <div className="auth-card-stage onboarding-stage">
                    <article className="auth-card-face onboarding-card">
                        <div className="onboarding-card-top">
                            <div>
                                <h2 className={`${headingFont.className} auth-face-title`}>
                                    Platform handles
                                </h2>
                                <p className="auth-face-copy">
                                    Save the handles you want to sync to your profile.
                                </p>
                            </div>

                            <div className="onboarding-session-pill">
                                {userId ? "Session ready" : "Waiting for session"}
                            </div>
                        </div>

                        <form className="auth-form onboarding-form" onSubmit={handleSubmit}>
                            <div className="onboarding-grid">
                                {PLATFORM_FIELDS.map(({ key, label, placeholder }) => (
                                    <div key={key} className="onboarding-field">
                                        <label className="auth-label" htmlFor={key}>
                                            {label}
                                        </label>
                                        <input
                                            className="auth-input"
                                            id={key}
                                            name={key}
                                            type="text"
                                            placeholder={placeholder}
                                            value={formState[key]}
                                            onChange={(e) => updateField(key, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>

                            <button className="auth-cta onboarding-cta" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <span className="onboarding-spinner" aria-hidden="true" />
                                        <span>Saving handles...</span>
                                    </>
                                ) : (
                                    "Save handles"
                                )}
                            </button>
                        </form>

                        <div className="onboarding-footer">
                            <p className="onboarding-status">{status}</p>
                        </div>
                    </article>
                </div>
            </section>
        </main>
    );
}
