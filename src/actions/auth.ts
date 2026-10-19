"use server";

import { adminAuth } from "@/server/auth/admin";
import { emailProviderConfigured, sendPasswordResetEmail } from "@/server/email/resend";
import { log } from "@/server/log";

export interface PasswordResetResult {
  ok: true;
  /**
   * "custom" — sent via our own branded email (Resend). "firebase" — no
   * custom provider is configured (or sending it just failed), so the
   * caller should fall back to Firebase Auth's own client-side mailer
   * instead of leaving the user with no email at all.
   */
  sentVia: "custom" | "firebase";
}

/**
 * Server-side password reset: generates the reset link via the Admin SDK
 * and emails it ourselves through a verified sending domain, instead of
 * Firebase Auth's built-in mailer (a shared, generic sender that reliably
 * lands in spam). Always resolves — including when the email doesn't
 * belong to any account — so the response never reveals which addresses
 * have accounts.
 */
export async function requestPasswordResetAction(email: string): Promise<PasswordResetResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !emailProviderConfigured()) {
    return { ok: true, sentVia: "firebase" };
  }

  try {
    const user = await adminAuth()
      .getUserByEmail(trimmed)
      .catch(() => null);
    if (user) {
      const link = await adminAuth().generatePasswordResetLink(trimmed);
      await sendPasswordResetEmail({ to: trimmed, resetLink: link, name: user.displayName ?? null });
    }
    return { ok: true, sentVia: "custom" };
  } catch (err) {
    log.error("custom password reset email failed, falling back to Firebase's mailer", {
      err: String(err),
    });
    return { ok: true, sentVia: "firebase" };
  }
}
