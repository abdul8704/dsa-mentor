import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP email wrapper (Nodemailer).
 *
 * Uses plain SMTP so it works with any provider WITHOUT owning a domain — e.g.
 * a personal Gmail account with an "App Password". Configure via env:
 *   SMTP_HOST   (e.g. smtp.gmail.com)
 *   SMTP_PORT   (465 for SSL, 587 for STARTTLS)
 *   SMTP_USER   (your full email address)
 *   SMTP_PASS   (an app password, NOT your normal password)
 *   EMAIL_FROM  (display name + address, defaults to SMTP_USER)
 *
 * Design goals:
 *  - Never throw into the caller's happy path just because email failed. An
 *    invite is still valid (and openable via its link / visible in-app) even if
 *    the email does not go out, so email problems are logged, not fatal.
 *  - Degrade gracefully when SMTP is not configured: log instead of sending,
 *    so the flow stays testable locally with zero email setup.
 */

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM ?? (SMTP_USER ? `AlgoMentor <${SMTP_USER}>` : "AlgoMentor");

// True only when the minimum SMTP settings are present.
const isConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

// Lazily create a single reusable transporter (connection pool).
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
    if (!isConfigured) {
        return null;
    }
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            // Port 465 uses implicit TLS; 587/others use STARTTLS.
            secure: SMTP_PORT === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
    }
    return transporter;
}

export interface SendEmailArgs {
    to: string;
    subject: string;
    html: string;
    /** Optional plain-text fallback for clients that don't render HTML. */
    text?: string;
}

export interface SendEmailResult {
    /** True when the provider accepted the message. */
    sent: boolean;
    /** Populated when sending was skipped or failed, for logging/UX. */
    reason?: string;
}

/**
 * Send a single transactional email. Returns a result object rather than
 * throwing, so callers can treat email as best-effort.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailArgs): Promise<SendEmailResult> {
    const tx = getTransporter();

    // No SMTP configured -> skip gracefully (dev-friendly).
    if (!tx) {
        console.warn(`[email] SMTP not configured; skipping email to ${to} (subject: "${subject}")`);
        return { sent: false, reason: "email_not_configured" };
    }

    try {
        console.log(`[email] Sending "${subject}" to ${to} via ${SMTP_HOST}`);
        const info = await tx.sendMail({ from: EMAIL_FROM, to, subject, html, text });
        console.log(`[email] Sent to ${to} (messageId: ${info.messageId})`);
        return { sent: true };
    } catch (err: unknown) {
        // Network / auth / unexpected failure — log and report without throwing.
        const message = err instanceof Error ? err.message : "Unknown email error";
        console.error(`[email] Failed sending to ${to}: ${message}`);
        return { sent: false, reason: message };
    }
}

/**
 * Build the HTML + text body for a mentorship invite email.
 *
 * @param mentorName Display name of the inviting mentor (fallbacks handled by caller).
 * @param acceptUrl  Absolute URL to the invite-accept page (contains the token).
 */
export function buildInviteEmail(mentorName: string, acceptUrl: string): { subject: string; html: string; text: string } {
    const subject = `${mentorName} invited you to AlgoMentor`;

    const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; background:#131315; padding:32px; color:#e5e1e4;">
            <div style="max-width:520px; margin:0 auto; background:#201f22; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:32px;">
                <h1 style="color:#ffb59d; font-size:24px; margin:0 0 8px;">AlgoMentor</h1>
                <p style="color:#dfc0b6; font-size:13px; letter-spacing:0.05em; text-transform:uppercase; margin:0 0 24px;">Mentorship Invitation</p>
                <p style="font-size:16px; line-height:1.6; margin:0 0 16px;">
                    <strong>${mentorName}</strong> has invited you to connect as their mentee on AlgoMentor —
                    a platform that tracks your competitive programming progress across LeetCode, Codeforces, and AtCoder.
                </p>
                <p style="font-size:16px; line-height:1.6; margin:0 0 28px;">
                    Create your account with this email address, then head to your Tasks page to accept the invitation
                    and let them view your progress and assign you problems.
                </p>
                <a href="${acceptUrl}"
                   style="display:inline-block; background:#f47144; color:#5d1800; font-weight:bold; text-decoration:none; padding:14px 28px; border-radius:10px; font-size:16px;">
                    Accept Invitation
                </a>
                <p style="font-size:13px; color:#dfc0b6; opacity:0.8; margin:28px 0 0; line-height:1.5;">
                    Or paste this link into your browser:<br />
                    <a href="${acceptUrl}" style="color:#ffb59d; word-break:break-all;">${acceptUrl}</a>
                </p>
                <p style="font-size:12px; color:#dfc0b6; opacity:0.6; margin:24px 0 0;">
                    This invitation expires in 14 days. If you weren't expecting it, you can safely ignore this email.
                </p>
            </div>
        </div>
    `.trim();

    const text = `${mentorName} invited you to AlgoMentor.\n\nCreate an account with this email, then accept the invitation here: ${acceptUrl}\n\nThis invitation expires in 14 days.`;

    return { subject, html, text };
}
