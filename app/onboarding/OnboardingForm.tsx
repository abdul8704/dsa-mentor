"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getBrowserClient } from "@/app/lib/supabase/browser-client";
import { addPlatformHandles, completeOnboarding, saveCsesUsername } from "../actions/profile.actions";
import { uploadAvatar, removeAvatar } from "../actions/avatar.actions";
import ConnectCsesForm from "../dashboard/components/ConnectCsesForm";
import ConnectLeetcodeForm from "../dashboard/components/ConnectLeetcodeForm";
import PublicApiSettings from "../dashboard/components/PublicApiSettings";
import ConnectedWidgets from "../dashboard/components/ConnectedWidgets";
import Card from "../dashboard/components/ui/Card";
import { PlatformLogo } from "../dashboard/components/ui/platforms";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import Logo from "../components/brand/Logo";

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
    { key: "atcoder", label: "AtCoder", placeholder: "your_atcoder_handle" },
];

const LOADING_MESSAGES = [
    "Saving your platform handles…",
    "Verifying your handles…",
];

type InvalidHandle = { platform: string; handle?: string; error?: string };

type SyncResult = {
    verified: string[];
    invalid: InvalidHandle[];
    /** True when the worker service couldn't be reached at all (network error/timeout). */
    unreachable?: boolean;
};

export default function OnboardingForm({
    platforms,
    profile,
    isEditing = false,
}: {
    platforms: { platform: string; handle: string }[] | null;
    profile: ProfileState;
    /** True when reached via the "Settings" link (/dashboard/settings) rather than first-time setup. */
    isEditing?: boolean;
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
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
    const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const avatarObjectUrlRef = useRef<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    // CSES has its own field below, deliberately outside `formState`/
    // `PLATFORM_FIELDS` — see saveCsesUsername's doc comment for why.
    const [csesUsername, setCsesUsername] = useState("");

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
        setCsesUsername(platforms?.find((p) => p.platform === "cses")?.handle ?? "");
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

    async function handleDeleteAccount() {
        if (isDeletingAccount) return;
        setIsDeletingAccount(true);
        setDeleteError(null);

        try {
            const res = await fetch("/api/account/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation: "DELETE" }),
            });
            const data: { success: boolean; message: string } = await res.json();

            if (!data.success) {
                setDeleteError(data.message || "Could not delete your account. Please try again.");
                setIsDeletingAccount(false);
                return;
            }

            // The server already cleared the session cookie; drop the local
            // client-side session too so nothing stale lingers in this tab.
            await supabase.auth.signOut();
            setShowDeleteConfirm(false);
            router.push("/auth");
        } catch {
            setDeleteError("Something went wrong. Please check your connection and try again.");
            setIsDeletingAccount(false);
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

        const trimmedCsesUsername = csesUsername.trim();

        if (nextPayload.length === 0 && !trimmedCsesUsername) {
            setStatus("Add at least one handle before submitting.");
            return;
        }

        setIsSubmitting(true);
        setStatus("Saving your platform handles...");

        try {
            const affectedPlatforms = nextPayload.length > 0
                ? (await addPlatformHandles(userId, nextPayload)).affectedPlatforms
                : [];

            // CSES has no bare-handle verification (see saveCsesUsername's doc
            // comment) so it never contributes to `affectedPlatforms` / the
            // fresh-init resync below — saving it is a plain, unrelated write.
            if (trimmedCsesUsername) {
                await saveCsesUsername(userId, trimmedCsesUsername);
            }

            await completeOnboarding(userId, {
                name: trimmedName,
                description: profileState.description,
            });

            // Only kick off the worker sync when a platform handle was actually
            // added/changed. Saving just the name/description, or re-submitting
            // unchanged handles, shouldn't trigger a resync.
            if (affectedPlatforms.length > 0) {
                setIsInitializing(true);

                const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
                if (serverUrl) {
                    // The worker verifies each handle actually exists (fast — a
                    // single request per platform) and responds immediately.
                    // The slow part — importing full submission history — keeps
                    // running on the worker in the background, well after this
                    // request returns, so it's safe to await here.
                    type FreshInitResponse = { success: boolean; verified?: string[]; invalid?: InvalidHandle[] };

                    try {
                        const { data } = await axios.post<FreshInitResponse>(
                            `${serverUrl}/refresh/fresh-init`,
                            { user_id: userId },
                            { timeout: 15000 }
                        );

                        setSyncResult({
                            verified: data.verified ?? affectedPlatforms,
                            invalid: data.invalid ?? [],
                        });
                    } catch (err) {
                        console.error("fresh-init request failed:", err);

                        // The worker responded (e.g. 422 — every handle failed
                        // verification): use its payload instead of treating
                        // this as unreachable.
                        if (axios.isAxiosError(err) && err.response?.data) {
                            const data = err.response.data as FreshInitResponse;
                            setSyncResult({
                                verified: data.verified ?? [],
                                invalid: data.invalid ?? affectedPlatforms.map((platform) => ({ platform })),
                            });
                        } else {
                            // Genuinely unreachable/timed out — don't block the
                            // user on it, just let them know syncing will
                            // continue (or be retried) in the background.
                            setSyncResult({ verified: affectedPlatforms, invalid: [], unreachable: true });
                        }
                    }
                } else {
                    setSyncResult({ verified: affectedPlatforms, invalid: [] });
                }

                setIsInitializing(false);
                return;
            }

            router.push("/dashboard");
        } catch {
            setIsInitializing(false);
            setStatus("Could not save handles right now. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    function dismissSyncModal() {
        setSyncResult(null);
        router.push("/dashboard");
    }

    const loadingOverlay =
        isMounted && isInitializing
            ? createPortal(
                  <div className="dash-portal" role="status" aria-live="polite" aria-busy="true">
                      <div className="dash-modal">
                          <div className="dash-modal-icon" aria-hidden="true">
                              <span className="dash-spinner" style={{ width: 22, height: 22 }} />
                          </div>
                          <p className="text-lg font-bold text-[color:var(--dash-content-primary)]">
                              {LOADING_MESSAGES[loadingMessageIndex]}
                          </p>
                          <p className="mt-1.5 text-sm text-[color:var(--dash-content-secondary)]">
                              Hang tight while we verify your handles.
                          </p>
                      </div>
                  </div>,
                  document.body
              )
            : null;

    const hasVerifiedHandle = (syncResult?.verified.length ?? 0) > 0;

    const syncModal =
        isMounted && syncResult
            ? createPortal(
                  <div className="dash-portal" role="presentation">
                      <div className="dash-modal" role="dialog" aria-modal="true" aria-labelledby="sync-modal-title">
                          <div className="dash-modal-icon" data-tone={hasVerifiedHandle ? undefined : "warning"} aria-hidden>
                              <span className="material-symbols-outlined">{hasVerifiedHandle ? "cloud_sync" : "error"}</span>
                          </div>
                          <h2 id="sync-modal-title" className="text-lg font-bold text-[color:var(--dash-content-primary)]">
                              {hasVerifiedHandle ? "Handles saved, syncing your data" : "We couldn't verify your handle"}
                          </h2>
                          <p className="mt-2 text-sm leading-relaxed text-[color:var(--dash-content-secondary)]">
                              {syncResult.unreachable
                                  ? "We couldn't reach the sync service right now, but your handles are saved. We'll pick up the import automatically."
                                  : hasVerifiedHandle
                                    ? `We verified ${syncResult.verified.join(", ")} and are importing your history in the background. This can take a few minutes to fully show up on your dashboard.`
                                    : "None of the handles you entered could be found on their platform. Double-check the spelling from Settings and save again."}
                          </p>
                          {syncResult.invalid.length > 0 && (
                              <ul className="mt-3 flex flex-col gap-1.5 text-left text-[13px]">
                                  {syncResult.invalid.map((entry) => (
                                      <li
                                          key={entry.platform}
                                          className="flex items-center gap-2 rounded-[var(--dash-r-md)] px-3 py-2 bg-[color:var(--dash-feedback-danger-wash)] text-[color:var(--dash-content-primary)]"
                                      >
                                          <PlatformLogo platform={entry.platform} size={14} />
                                          <strong className="capitalize">{entry.platform}</strong>
                                          <span className="text-[color:var(--dash-content-secondary)]">{entry.error ?? "handle not found"}</span>
                                      </li>
                                  ))}
                              </ul>
                          )}
                          <button type="button" className="dash-btn dash-btn-primary w-full mt-5" onClick={dismissSyncModal}>
                              Continue to dashboard
                          </button>
                      </div>
                  </div>,
                  document.body
              )
            : null;

    const deleteAccountModal =
        isMounted && showDeleteConfirm
            ? createPortal(
                  <div className="dash-portal" role="presentation" onClick={() => !isDeletingAccount && setShowDeleteConfirm(false)}>
                      <div
                          className="dash-modal"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="delete-account-modal-title"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                              if (e.key === "Escape" && !isDeletingAccount) setShowDeleteConfirm(false);
                          }}
                      >
                          <div className="dash-modal-icon" data-tone="danger" aria-hidden>
                              <span className="material-symbols-outlined">warning</span>
                          </div>
                          <h2 id="delete-account-modal-title" className="text-lg font-bold text-[color:var(--dash-content-primary)]">
                              Delete your account?
                          </h2>
                          <p className="mt-2 text-sm leading-relaxed text-[color:var(--dash-content-secondary)]">
                              This permanently deletes your account and every piece of data tied to it: solved problems,
                              streaks, contest history, platform handles, mentorships, notes, and your profile photo. This
                              cannot be undone.
                          </p>
                          {deleteError && (
                              <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-[color:var(--dash-feedback-danger)]">
                                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                      error
                                  </span>
                                  {deleteError}
                              </p>
                          )}
                          <div className="mt-5 grid grid-cols-2 gap-3">
                              <button
                                  type="button"
                                  className="dash-btn dash-btn-ghost"
                                  onClick={() => setShowDeleteConfirm(false)}
                                  disabled={isDeletingAccount}
                                  autoFocus
                              >
                                  Cancel
                              </button>
                              <button type="button" className="dash-btn dash-btn-danger" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
                                  {isDeletingAccount ? (
                                      <>
                                          <span className="dash-spinner" aria-hidden="true" />
                                          Deleting…
                                      </>
                                  ) : (
                                      "Delete permanently"
                                  )}
                              </button>
                          </div>
                      </div>
                  </div>,
                  document.body
              )
            : null;

    const hasAvatar = Boolean(avatarPreview || profileState.avatarUrl);

    const profileCard = (
        <Card title="Profile" hint="how mentors and your public page see you">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div
                    className={`group relative w-24 h-24 flex-none rounded-full cursor-pointer transition-[transform,box-shadow] duration-[var(--dash-dur-base)] hover:scale-[1.03] ${
                        isDraggingAvatar ? "ring-2 ring-[color:var(--dash-accent)] ring-offset-4 ring-offset-[color:var(--dash-surface-raised)]" : ""
                    }`}
                    style={{ background: "var(--dash-grad-accent)", padding: 2 }}
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
                    <div className="relative w-full h-full rounded-full overflow-hidden grid place-items-center bg-[color:var(--dash-surface-sunken)]">
                        {hasAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element -- external/blob URL
                            <img src={avatarPreview ?? profileState.avatarUrl} alt="Profile picture" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl font-bold text-[color:var(--dash-content-secondary)]">
                                {profileState.name.charAt(0).toUpperCase() || "?"}
                            </span>
                        )}
                        <div
                            className={`absolute inset-0 grid place-items-center bg-black/55 text-white transition-opacity duration-[var(--dash-dur-fast)] ${
                                isUploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                            }`}
                        >
                            {isUploadingAvatar ? (
                                <span className="dash-spinner" aria-hidden="true" />
                            ) : (
                                <span className="material-symbols-outlined" aria-hidden="true">
                                    photo_camera
                                </span>
                            )}
                        </div>
                    </div>
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="sr-only"
                        tabIndex={-1}
                        onChange={handleAvatarSelected}
                    />
                </div>

                <div className="flex flex-col gap-2 min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--dash-content-primary)]">Profile photo</p>
                    <p className="text-xs text-[color:var(--dash-content-tertiary)]">
                        {isUploadingAvatar
                            ? "Uploading your photo…"
                            : "Drag and drop, or click the photo. JPEG, PNG, WEBP or GIF, up to 5 MB."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="dash-btn dash-btn-ghost dash-btn-sm"
                            disabled={isUploadingAvatar}
                            onClick={() => avatarInputRef.current?.click()}
                        >
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                                upload
                            </span>
                            {profileState.avatarUrl ? "Change photo" : "Upload photo"}
                        </button>
                        {profileState.avatarUrl && (
                            <button
                                type="button"
                                className="dash-btn dash-btn-sm text-[color:var(--dash-content-secondary)] hover:text-[color:var(--dash-feedback-danger)]"
                                disabled={isUploadingAvatar || isRemovingAvatar}
                                onClick={handleRemoveAvatar}
                            >
                                {isRemovingAvatar ? "Removing…" : "Remove"}
                            </button>
                        )}
                    </div>
                    {avatarError && (
                        <p className="flex items-center gap-1.5 text-xs text-[color:var(--dash-feedback-danger)]" role="alert">
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                                error
                            </span>
                            {avatarError}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="dash-field-label" htmlFor="profile-name">
                        Name
                    </label>
                    <input
                        className="dash-input"
                        id="profile-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Your name"
                        required
                        value={profileState.name}
                        onChange={(e) => updateProfileField("name", e.target.value)}
                    />
                </div>
                <div>
                    <label className="dash-field-label" htmlFor="profile-description">
                        Headline <span className="font-normal text-[color:var(--dash-content-tertiary)]">(optional)</span>
                    </label>
                    <input
                        className="dash-input"
                        id="profile-description"
                        name="description"
                        type="text"
                        placeholder="e.g. Grinding for ICPC regionals"
                        value={profileState.description}
                        onChange={(e) => updateProfileField("description", e.target.value)}
                    />
                </div>
            </div>
        </Card>
    );

    const handlesCard = (
        <Card
            title="Platform handles"
            hint="we sync solves, ratings and contests from these"
            action={
                <span className={`dash-chip ${userId ? "dash-chip-good" : "dash-chip-idle"}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                    {userId ? "Session ready" : "Waiting for session"}
                </span>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLATFORM_FIELDS.map(({ key, label, placeholder }) => (
                    <div key={key}>
                        <label className="dash-field-label" htmlFor={key}>
                            {label}
                        </label>
                        <div className="dash-input-wrap">
                            <span className="dash-input-icon">
                                <PlatformLogo platform={key} size={16} />
                            </span>
                            <input
                                className="dash-input"
                                id={key}
                                name={key}
                                type="text"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                placeholder={placeholder}
                                value={formState[key]}
                                onChange={(e) => updateField(key, e.target.value)}
                            />
                        </div>
                    </div>
                ))}

                <div>
                    <label className="dash-field-label" htmlFor="cses">
                        CSES
                    </label>
                    <div className="dash-input-wrap">
                        <span className="dash-input-icon">
                            <PlatformLogo platform="cses" size={16} />
                        </span>
                        <input
                            className="dash-input"
                            id="cses"
                            name="cses"
                            type="text"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="your_cses_username"
                            value={csesUsername}
                            onChange={(e) => setCsesUsername(e.target.value)}
                        />
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--dash-content-tertiary)]">
                        CSES has no public API, so this only saves your username. Connect your session or password{" "}
                        {isEditing ? (
                            <a href="#connections" className="text-[color:var(--dash-accent-soft)] hover:underline">
                                below
                            </a>
                        ) : (
                            "from Settings later"
                        )}{" "}
                        to import your solved problems.
                    </p>
                </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-4 border-t border-[color:var(--dash-border-subtle)]">
                <p className="text-xs text-[color:var(--dash-content-tertiary)]" aria-live="polite">
                    {status}
                </p>
                <button className="dash-btn dash-btn-primary sm:ml-auto min-w-[160px]" type="submit" disabled={isSubmitting || isInitializing}>
                    {isSubmitting ? (
                        <>
                            <span className="dash-spinner" aria-hidden="true" />
                            Saving…
                        </>
                    ) : isEditing ? (
                        "Save changes"
                    ) : (
                        "Save and open dashboard"
                    )}
                </button>
            </div>
        </Card>
    );

    const modals = (
        <>
            {loadingOverlay}
            {syncModal}
            {deleteAccountModal}
        </>
    );

    // ── First-time setup: a focused, centred page outside the dashboard. ──
    if (!isEditing) {
        return (
            <main className="dashboard-shell relative overflow-hidden">
                {modals}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
                    style={{ background: "var(--dash-grad-hero)" }}
                />
                <div className="relative mx-auto max-w-[760px] px-4 py-10 md:py-16 flex flex-col gap-6">
                    <Link href="/" className="inline-flex items-center gap-2.5 self-start">
                        <Logo size={36} glow />
                    </Link>
                    <header className="flex flex-col gap-2">
                        <span className="dash-chip dash-chip-accent self-start">One-time setup</span>
                        <h1 className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold leading-tight tracking-[-0.02em]">
                            Connect your coding platforms
                        </h1>
                        <p className="text-[15px] text-[color:var(--dash-content-secondary)] max-w-[60ch]">
                            Add your handles once. We pull your solves, ratings and contests from each platform and keep them
                            in sync, so your dashboard is ready the moment the import finishes.
                        </p>
                    </header>
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        {profileCard}
                        {handlesCard}
                    </form>
                </div>
            </main>
        );
    }

    // ── Settings: lives inside the dashboard shell (sidebar + tokens). ──
    const SECTIONS = [
        { id: "profile", label: "Profile", icon: "person" },
        { id: "handles", label: "Platform handles", icon: "link" },
        { id: "connections", label: "Connections", icon: "sync_lock" },
        { id: "public", label: "Public profile & API", icon: "public" },
        { id: "danger", label: "Delete account", icon: "delete" },
    ];

    return (
        <div className="flex flex-col gap-6">
            {modals}
            <header className="flex flex-col gap-1">
                <h1 className="text-[clamp(1.5rem,3vw,1.875rem)] font-bold tracking-[-0.02em]">Settings</h1>
                <p className="text-sm text-[color:var(--dash-content-secondary)]">
                    Your profile, the platforms we sync, and what you share publicly.
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-[200px_minmax(0,1fr)] gap-6 items-start">
                <nav aria-label="Settings sections" className="hidden xl:flex flex-col gap-0.5 sticky top-8">
                    {SECTIONS.map((s) => (
                        <a
                            key={s.id}
                            href={`#${s.id}`}
                            className="dash-row flex items-center gap-2.5 px-3 min-h-[40px] text-[13px] font-semibold text-[color:var(--dash-content-secondary)] hover:text-[color:var(--dash-content-primary)]"
                        >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                {s.icon}
                            </span>
                            {s.label}
                        </a>
                    ))}
                </nav>

                <div className="flex flex-col gap-4 min-w-0 max-w-[920px]">
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <div id="profile" className="scroll-mt-24">
                            {profileCard}
                        </div>
                        <div id="handles" className="scroll-mt-24">
                            {handlesCard}
                        </div>
                    </form>

                    {userId && (
                        <>
                            <div id="connections" className="scroll-mt-24 grid grid-cols-1 2xl:grid-cols-2 gap-4 [&>*]:h-full">
                                <ConnectLeetcodeForm userId={userId} />
                                <ConnectCsesForm userId={userId} />
                            </div>
                            <div id="public" className="scroll-mt-24 flex flex-col gap-4">
                                <PublicApiSettings />
                                <ConnectedWidgets />
                            </div>
                        </>
                    )}

                    <section
                        id="danger"
                        className="scroll-mt-24 dash-card"
                        style={{ borderColor: "rgba(242, 97, 95, 0.35)" }}
                        aria-labelledby="danger-title"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                            <h2 id="danger-title" className="dash-card-title text-[color:var(--dash-feedback-danger)]">
                                Delete account
                            </h2>
                            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--dash-content-secondary)]">
                                Permanently deletes your account and all your data: solved problems, streaks, contests,
                                mentorships and notes. This cannot be undone.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="dash-btn dash-btn-danger"
                            onClick={() => {
                                setDeleteError(null);
                                setShowDeleteConfirm(true);
                            }}
                        >
                            Delete my account
                        </button>
                      </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
