import "server-only";
import { Resend } from "resend";
import { log } from "@/server/log";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

let client: Resend | null = null;

function resend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/**
 * Whether a real transactional-email provider is wired up. Until
 * `RESEND_API_KEY` is set (and the sending domain verified in Resend),
 * callers should fall back to Firebase Auth's own built-in mailer instead —
 * that's the address that lands in spam, but it beats sending nothing.
 */
export function emailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * `EMAIL_FROM_ADDRESS` should be `AmaaShop <noreply@amaashop.com>` once the
 * domain is verified in the Resend dashboard. Falls back to Resend's shared
 * sandbox sender, which works immediately with no domain setup but is only
 * fit for testing — it has the same generic-sender deliverability problem
 * this module exists to fix.
 */
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || `${SITE_NAME} <onboarding@resend.dev>`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetLink: string;
  name?: string | null;
}): Promise<void> {
  const greeting = opts.name ? `Hi ${escapeHtml(opts.name)},` : "Hi,";
  const subject = `Reset your ${SITE_NAME} password`;

  const text = [
    greeting,
    "",
    `We received a request to reset the password for your ${SITE_NAME} account (${opts.to}).`,
    "",
    `Reset your password: ${opts.resetLink}`,
    "",
    "This link expires in 1 hour. If you didn't request this, no action is needed — your password will stay the same.",
    "",
    SITE_NAME,
    SITE_URL,
  ].join("\n");

  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">
  <p style="font-size:15px;line-height:1.6;">${greeting}</p>
  <p style="font-size:15px;line-height:1.6;">
    We received a request to reset the password for your ${escapeHtml(SITE_NAME)} account
    (${escapeHtml(opts.to)}).
  </p>
  <p style="margin:28px 0;">
    <a href="${opts.resetLink}"
       style="background:#059669;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">
      Reset your password
    </a>
  </p>
  <p style="font-size:13px;line-height:1.6;color:#6b7280;">
    This link expires in 1 hour. If you didn't request this, no action is needed — your password will
    stay the same.
  </p>
  <p style="font-size:13px;line-height:1.6;color:#6b7280;margin-top:32px;">
    ${escapeHtml(SITE_NAME)}<br />
    <a href="${SITE_URL}" style="color:#6b7280;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
  </p>
</div>`.trim();

  const { error } = await resend().emails.send({ from: FROM_ADDRESS, to: opts.to, subject, text, html });
  if (error) {
    log.error("Resend password reset email failed", {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      to: opts.to,
    });
    throw new Error(error.message);
  }
}
