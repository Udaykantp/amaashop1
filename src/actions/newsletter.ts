"use server";

import { z } from "zod";

const emailSchema = z.string().trim().email("Enter a valid email address");

export type NewsletterResult = { success: true } | { success: false; error: string };

/**
 * Same honest pattern as `actions/contact.ts`: real server-side validation,
 * not client-only theater — but there's no email marketing provider (e.g.
 * Mailchimp/Resend audiences) or `subscribers` collection wired up yet, so
 * this currently just logs. Swap the `console.log` for a real provider call
 * in production.
 */
export async function subscribeNewsletterAction(formData: FormData): Promise<NewsletterResult> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email address" };
  }

  console.log("[newsletter] new subscriber:", parsed.data);

  return { success: true };
}
