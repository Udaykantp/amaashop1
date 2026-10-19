"use server";

import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email address"),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

export type ContactResult = { success: true } | { success: false; error: string };

/**
 * Validates and records a contact submission. There's no `contact_messages`
 * collection or email provider wired up yet, so this currently just logs
 * server-side — in production, swap the `console.log` for an email send
 * (Resend/SendGrid) or a write into Firestore.
 * Kept as a real Server Action (not client-only `setTimeout` theater) so
 * the validation and the eventual delivery integration both live here.
 */
export async function submitContactAction(formData: FormData): Promise<ContactResult> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  console.log("[contact] new submission:", parsed.data);

  return { success: true };
}
