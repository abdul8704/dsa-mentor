"use client";

import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getBrowserClient } from "@/app/lib/supabase/browser-client";
import { addPlatformHandles, completeOnboarding } from "../actions/profile.actions";
import { uploadAvatar, removeAvatar } from "../actions/avatar.actions";
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
    avatarUrl: string;
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
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
    const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const avatarObjectUrlRef = useRef<string | null>(null);

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

    const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

    function clearAvatarObjectUrl() {
        if (avatarObjectUrlRef.current) {
            URL.revokeObjectURL(avatarObjectUrlRef.current);
            avatarObjectUrlRef.current = null;
        }
    }

    useEffect(() => {
        return () => clearAvatarObjectUrl();
    }, []);

    async function processAvatarFile(file: File) {
        if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
            setAvatarError("Please upload a JPEG, PNG, WEBP, or GIF image.");
            return;
        }
        if (file.size > MAX_AVATAR_BYTES) {
            setAvatarError("Image must be smaller than 5 MB.");
            return;
        }

        setAvatarError(null);
        clearAvatarObjectUrl();
        const objectUrl = URL.createObjectURL(file);
        avatarObjectUrlRef.current = objectUrl;
        setAvatarPreview(objectUrl);
        setIsUploadingAvatar(true);

        try {
            const formData = new FormData();
            formData.set("file", file);
            const result = await uploadAvatar(formData);
            if (result.success && result.avatarUrl) {
                updateProfileField("avatarUrl", result.avatarUrl);
            } else {
                setAvatarError(result.message);
            }
        } catch {
            setAvatarError("Could not upload your picture. Please try again.");
        } finally {
            clearAvatarObjectUrl();
            setAvatarPreview(null);
            setIsUploadingAvatar(false);
        }
    }

    async function handleAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = ""; // allow re-selecting the same file later
        if (!file) return;
        void processAvatarFile(file);
    }

    function handleAvatarDrop(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDraggingAvatar(false);
        const file = event.dataTransfer.files?.[0];
        if (file) void processAvatarFile(file);
    }

    async function handleRemoveAvatar() {
        if (isRemovingAvatar || isUploadingAvatar) return;
        setIsRemovingAvatar(true);
        setAvatarError(null);
        try {
            const result = await removeAvatar();
            if (result.success) {
                updateProfileField("avatarUrl", "");
            } else {
                setAvatarError(result.message);
            }
        } catch {
            setAvatarError("Could not remove your picture. Please try again.");
        } finally {
            setIsRemovingAvatar(false);
        }
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
            const { affectedPlatforms } = await addPlatformHandles(userId, nextPayload);
            await completeOnboarding(userId, {
                name: trimmedName,
                description: profileState.description,
            });

            // Only kick off the (slow) worker sync when a platform handle was
            // actually added/changed. Saving just the name/description, or
            // re-submitting unchanged handles, shouldn't trigger a resync.
            if (affectedPlatforms.length > 0) {
                setIsInitializing(true);

                const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
                if (serverUrl) {
                    // Fire-and-forget: kicks off background stat syncing on the
                    // worker service for the platforms whose handle changed.
                    // This must never block navigation, since the worker may be
                    // slow, unreachable, or not deployed.
                    axios
                        .post(
                            `${serverUrl}/refresh/fresh-init`,
                            { user_id: userId },
                            { timeout: 5000 }
                        )
                        .catch((err) => {
                            console.error("fresh-init request failed:", err);
                        });
                }
            }

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
                            <div className="onboarding-avatar-row">
                                <div
                                    className={`onboarding-avatar-dropzone${isDraggingAvatar ? " onboarding-avatar-dropzone-active" : ""}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label="Upload profile picture"
                                    onClick={() => avatarInputRef.current?.click()}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            avatarInputRef.current?.click();
                                        }
                                    }}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDraggingAvatar(true);
                                    }}
                                    onDragLeave={() => setIsDraggingAvatar(false)}
                                    onDrop={handleAvatarDrop}
                                >
                                    <div className="onboarding-avatar-preview">
                                        {avatarPreview || profileState.avatarUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element -- external/blob URL
                                            <img src={avatarPreview ?? profileState.avatarUrl} alt="Profile picture" />
                                        ) : (
                                            <span>{profileState.name.charAt(0).toUpperCase() || "?"}</span>
                                        )}

                                        <div className="onboarding-avatar-hover">
                                            {isUploadingAvatar ? (
                                                <span className="onboarding-spinner" aria-hidden="true" />
                                            ) : (
                                                <span className="material-symbols-outlined" aria-hidden="true">
                                                    photo_camera
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="onboarding-avatar-badge"
                                        aria-label="Change profile picture"
                                        disabled={isUploadingAvatar}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            avatarInputRef.current?.click();
                                        }}
                                    >
                                        <span className="material-symbols-outlined" aria-hidden="true">
                                            edit
                                        </span>
                                    </button>

                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        className="onboarding-avatar-input"
                                        onChange={handleAvatarSelected}
                                    />
                                </div>

                                <div className="onboarding-avatar-actions">
                                    <p className="onboarding-avatar-title">Profile photo</p>
                                    <p className="onboarding-avatar-hint">
                                        {isUploadingAvatar
                                            ? "Uploading your photo…"
                                            : "Drag & drop, or click the photo to upload. JPEG, PNG, WEBP, or GIF, up to 5 MB."}
                                    </p>
                                    <div className="onboarding-avatar-buttons">
                                        <button
                                            type="button"
                                            className="onboarding-avatar-cta"
                                            disabled={isUploadingAvatar}
                                            onClick={() => avatarInputRef.current?.click()}
                                        >
                                            {profileState.avatarUrl ? "Change photo" : "Upload photo"}
                                        </button>
                                        {profileState.avatarUrl && (
                                            <button
                                                type="button"
                                                className="onboarding-avatar-remove"
                                                disabled={isUploadingAvatar || isRemovingAvatar}
                                                onClick={handleRemoveAvatar}
                                            >
                                                {isRemovingAvatar ? "Removing..." : "Remove"}
                                            </button>
                                        )}
                                    </div>
                                    {avatarError && (
                                        <p className="onboarding-avatar-error">
                                            <span className="material-symbols-outlined" aria-hidden="true">
                                                error
                                            </span>
                                            {avatarError}
                                        </p>
                                    )}
                                </div>
                            </div>

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
