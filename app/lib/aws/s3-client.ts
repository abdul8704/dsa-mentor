import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

/**
 * S3 client for profile picture uploads (server-only). Requires the bucket to
 * allow public reads (either "Block all public access" disabled + a
 * bucket policy granting `s3:GetObject`, or served through a CDN in front of
 * it) since avatar URLs are stored and rendered directly as public <img> src.
 */

let s3Client: S3Client | null = null;

function getEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing AWS env var: ${name}`);
    }
    return value;
}

function getS3Client(): S3Client {
    if (s3Client) return s3Client;

    s3Client = new S3Client({
        region: getEnv("AWS_REGION"),
        credentials: {
            accessKeyId: getEnv("AWS_ACCESS_KEY_ID"),
            secretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY"),
        },
    });

    return s3Client;
}

/** Public HTTPS URL for an object key, honoring an optional CDN base override. */
function publicUrlFor(key: string): string {
    const cdnBase = process.env.AWS_S3_PUBLIC_URL_BASE;
    if (cdnBase) {
        return `${cdnBase.replace(/\/$/, "")}/${key}`;
    }
    const bucket = getEnv("AWS_S3_BUCKET_NAME");
    const region = getEnv("AWS_REGION");
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/** Uploads a buffer to S3 under the given key and returns its public URL. */
export async function uploadToS3(params: { key: string; body: Buffer; contentType: string }): Promise<string> {
    const bucket = getEnv("AWS_S3_BUCKET_NAME");
    const client = getS3Client();

    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: params.key,
            Body: params.body,
            ContentType: params.contentType,
            CacheControl: "public, max-age=31536000, immutable",
        })
    );

    return publicUrlFor(params.key);
}

/** Best-effort deletion of a previous object (e.g. when replacing an avatar). Never throws. */
export async function deleteFromS3(key: string): Promise<void> {
    try {
        const bucket = getEnv("AWS_S3_BUCKET_NAME");
        const client = getS3Client();
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch (error) {
        console.error(`[s3] Failed to delete key "${key}": ${error instanceof Error ? error.message : error}`);
    }
}

/**
 * Best-effort deletion of every object under a key prefix (e.g. all of a
 * user's avatar revisions, not just the one referenced by their profile
 * row). Paginates through ListObjectsV2 and batch-deletes in chunks of 1000
 * (the S3 DeleteObjects limit). Never throws — account wipes should not fail
 * because of an S3 hiccup.
 */
export async function deleteS3Prefix(prefix: string): Promise<number> {
    try {
        const bucket = getEnv("AWS_S3_BUCKET_NAME");
        const client = getS3Client();
        let deleted = 0;
        let continuationToken: string | undefined;

        do {
            const listed = await client.send(
                new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken })
            );

            const keys = (listed.Contents ?? []).flatMap((obj) => (obj.Key ? [{ Key: obj.Key }] : []));
            if (keys.length > 0) {
                await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
                deleted += keys.length;
            }

            continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
        } while (continuationToken);

        return deleted;
    } catch (error) {
        console.error(`[s3] Failed to delete prefix "${prefix}": ${error instanceof Error ? error.message : error}`);
        return 0;
    }
}

/** Extracts the S3 object key from a URL previously returned by uploadToS3, or null if it doesn't look like one of ours. */
export function keyFromPublicUrl(url: string): string | null {
    try {
        const cdnBase = process.env.AWS_S3_PUBLIC_URL_BASE;
        if (cdnBase && url.startsWith(cdnBase)) {
            return url.slice(cdnBase.replace(/\/$/, "").length + 1);
        }
        const bucket = process.env.AWS_S3_BUCKET_NAME;
        const region = process.env.AWS_REGION;
        const prefix = bucket && region ? `https://${bucket}.s3.${region}.amazonaws.com/` : null;
        if (prefix && url.startsWith(prefix)) {
            return url.slice(prefix.length);
        }
        return null;
    } catch {
        return null;
    }
}
