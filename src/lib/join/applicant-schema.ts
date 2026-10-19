import { z } from "zod";
import { normalizePhone } from "@/server/referral/resolve";

/**
 * The applicant's personal + address fields, shared by the public `/join`
 * funnel (`src/actions/join.ts`) and the admin "enroll a distributor" flow
 * (`src/actions/admin.ts` → `src/server/network/enroll.ts`) so both capture and
 * validate exactly the same information. The public form additionally layers on
 * `referrerInput` + consent + captcha; the admin form layers on `referrerInput`
 * + an operator attestation.
 */

export const NAME_RE = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
export const PIN_RE = /^\d{6}$/;

export const applicantSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v) ?? "")
    .refine((v) => v.length === 10, "Enter a valid 10-digit mobile number"),
  fullName: z.string().trim().regex(NAME_RE, "Enter the full name (letters only)"),
  age: z.coerce.number().int().min(18, "Must be at least 18").max(100, "Enter a valid age"),
  familyMemberCount: z.coerce
    .number()
    .int()
    .min(0)
    .max(30, "Enter a valid number of family members"),
  gender: z
    .enum(["FEMALE", "MALE", "OTHER"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  idProofType: z
    .enum(["AADHAAR_LAST4", "PAN", "VOTER_ID", "DL"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  idProofValue: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  nomineeName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  addressLine: z.string().trim().min(3, "Enter the house / street").max(160),
  city: z.string().trim().min(2, "Enter the village / city").max(80),
  district: z.string().trim().min(2, "Enter the district").max(80),
  state: z.string().trim().min(2, "Enter the state").max(80),
  pincode: z.string().trim().regex(PIN_RE, "Enter a valid 6-digit pincode"),
});

export type ApplicantInput = z.infer<typeof applicantSchema>;

/** Reduce a raw ID-proof value to a stored last-4 (never the full number). */
export function idProofLast4(
  type: string | undefined | null,
  value: string | undefined | null,
): string | null {
  if (!type || !value) return null;
  const cleaned = value.replace(/\s+/g, "");
  if (type === "AADHAAR_LAST4") {
    const digits = cleaned.replace(/\D/g, "");
    return digits.slice(-4) || null;
  }
  return cleaned.slice(-4).toUpperCase() || null;
}
