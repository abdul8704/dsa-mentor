"use client";

import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getBrowserClient } from "@/app/lib/supabase/browser-client";
import { addPlatformHandles, completeOnboarding } from "../actions/profile.actions";
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

type PlatformKey = "leetcode" | "codeforces" | "atcoder";

type FormState = Record<PlatformKey, string>;

type ProfileState = {
    name: string;
    description: string;
};

const EMPTY_FORM_STATE: FormState = {
    leetcode: "",
    codeforces: "",
    atcoder: "",
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
    { key: "atcoder", label: "Atcoder", placeholder: "your_atcoder_handle" },
];

const LOADING_MESSAGES = [
    "Initialising your profile…",
    "Fetching your platform data…",
];

export default function OnboardingForm({
    platforms,
    profile,
}: {
    platforms: { platform: string; handle: string }[] | null;
    profile: ProfileState;
}) {
    const supabase = getBrowserClient();
    const router = useRouter();

    const [userId, setUserId] = useState("");
    const [formState, setFormState] = useState<FormState>(() => buildInitialFormState(platforms));
    const [profileState, setProfileState] = useState<ProfileState>(profile);
    const [status, setStatus] = useState("Ready to collect your platform handles.");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

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

    useEffect(() => {
        setProfileState(profile);
    }, [profile]);

    useEffect(() => {
        if (!isInitializing) {
            setLoadingMessageIndex(0);
            return;
        }

        const timer = window.setInterval(() => {
            setLoadingMessageIndex((current) => (current + 1) % LOADING_MESSAGES.length);
        }, 2200);

        return () => window.clearInterval(timer);
    }, [isInitializing]);

    function updateField(key: PlatformKey, value: string) {
        setFormState((current) => ({
            ...current,
            [key]: value,
        }));
    }

    function updateProfileField(key: keyof ProfileState, value: string) {
        setProfileState((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSubmitting || isInitializing) {
            return;
        }

        if (!userId) {
            setStatus("Unable to read your session yet. Please wait a moment and try again.");
            return;
        }

        const trimmedName = profileState.name.trim();
        if (!trimmedName) {
            setStatus("Please enter your name before submitting.");
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
            await completeOnboarding(userId, {
                name: trimmedName,
                description: profileState.description,
            });

            setIsInitializing(true);

            await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URL}/refresh/fresh-init`, { user_id: userId });
            router.push("/dashboard");
        } catch {
            setIsInitializing(false);
            setStatus("Could not save handles right now. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const loadingOverlay =
        isMounted && isInitializing
            ? createPortal(
                  <div className="onboarding-loading-overlay" role="status" aria-live="polite" aria-busy="true">
                      <div className="onboarding-loading-card">
                          <div className="onboarding-loading-spinner-wrap" aria-hidden="true">
                              <span className="onboarding-loading-spinner" />
                          </div>
                          <p className={`${headingFont.className} onboarding-loading-title`}>
                              {LOADING_MESSAGES[loadingMessageIndex]}
                          </p>
                          <p className="onboarding-loading-copy">
                              Hang tight while we pull in your stats and set up your dashboard.
                          </p>
                      </div>
                  </div>,
                  document.body
              )
            : null;

    return (
        <main className={`auth-shell onboarding-shell ${bodyFont.className}`}>
            {loadingOverlay}
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
                            <div className="onboarding-grid onboarding-profile-grid">
                                <div className="onboarding-field onboarding-field-full">
                                    <label className="auth-label" htmlFor="profile-name">
                                        Name
                                    </label>
                                    <input
                                        className="auth-input"
                                        id="profile-name"
                                        name="name"
                                        type="text"
                                        placeholder="Your name"
                                        required
                                        value={profileState.name}
                                        onChange={(e) => updateProfileField("name", e.target.value)}
                                    />
                                </div>

                                <div className="onboarding-field onboarding-field-full">
                                    <label className="auth-label" htmlFor="profile-description">
                                        Description
                                    </label>
                                    <input
                                        className="auth-input"
                                        id="profile-description"
                                        name="description"
                                        type="text"
                                        placeholder="dsa enthusiast"
                                        value={profileState.description}
                                        onChange={(e) => updateProfileField("description", e.target.value)}
                                    />
                                </div>
                            </div>

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

                            <button className="auth-cta onboarding-cta" type="submit" disabled={isSubmitting || isInitializing}>
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
