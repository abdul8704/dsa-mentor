"use server";

import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { requireUser } from "@/app/lib/mentorship/access";
import { uploadToS3, deleteFromS3, keyFromPublicUrl } from "@/app/lib/aws/s3-client";
import type { ActionResult } from "@/app/lib/types/mentorship";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
};

interface UploadAvatarResult extends ActionResult {
    avatarUrl?: string;
}

/**
 * Uploads a new profile picture to S3 and stores its public URL on the
 * caller's `profile` row. Accepts a FormData with a single "file" entry so it
 * can be called directly from a <form>/client component without a JSON
 * serialization step for the binary payload.
 */
export async function uploadAvatar(formData: FormData): Promise<UploadAvatarResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const file = formData.get("file");
        if (!(file instanceof File)) {
            return { success: false, message: "No file was provided." };
        }

        const ext = ALLOWED_CONTENT_TYPES[file.type];
        if (!ext) {
            return { success: false, message: "Please upload a JPEG, PNG, WEBP, or GIF image." };
        }

        if (file.size > MAX_AVATAR_BYTES) {
            return { success: false, message: "Image must be smaller than 5 MB." };
        }

        const { data: existing } = await supabase.from("profile").select("avatar_url").eq("user_id", me.id).maybeSingle();

        const buffer = Buffer.from(await file.arrayBuffer());
        const key = `avatars/${me.id}/${Date.now()}.${ext}`;

        const avatarUrl = await uploadToS3({ key, body: buffer, contentType: file.type });

        const { error } = await supabase.from("profile").update({ avatar_url: avatarUrl }).eq("user_id", me.id);
        if (error) {
            console.error(`[avatar] Failed to save avatar_url: ${error.message}`);
            return { success: false, message: "Uploaded the image but could not save it to your profile." };
        }

        // Best-effort cleanup of the previous image so old objects don't pile up.
        if (existing?.avatar_url) {
            const oldKey = keyFromPublicUrl(existing.avatar_url);
            if (oldKey) void deleteFromS3(oldKey);
        }

        console.log(`[avatar] ${me.id} updated their profile picture`);
        return { success: true, message: "Profile picture updated.", avatarUrl };
    } catch (error) {
        console.error(`[avatar] uploadAvatar failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong uploading your picture. Please try again." };
    }
}

/** Clears the caller's profile picture and best-effort deletes the S3 object. */
export async function removeAvatar(): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient();
        const me = await requireUser(supabase);

        const { data: existing } = await supabase.from("profile").select("avatar_url").eq("user_id", me.id).maybeSingle();

        const { error } = await supabase.from("profile").update({ avatar_url: null }).eq("user_id", me.id);
        if (error) {
            console.error(`[avatar] Failed to clear avatar_url: ${error.message}`);
            return { success: false, message: "Could not remove your profile picture. Please try again." };
        }

        if (existing?.avatar_url) {
            const oldKey = keyFromPublicUrl(existing.avatar_url);
            if (oldKey) void deleteFromS3(oldKey);
        }

        return { success: true, message: "Profile picture removed." };
    } catch (error) {
        console.error(`[avatar] removeAvatar failed: ${error instanceof Error ? error.message : error}`);
        return { success: false, message: "Something went wrong. Please try again." };
    }
}
