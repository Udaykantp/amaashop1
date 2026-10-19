"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { writeAudit } from "@/server/audit";
import { verifyCaptcha } from "@/server/captcha";
import { Collections, db, nowSentinel, runUniqueTransaction, UniqueConstraintError } from "@/server/firestore";
import type { AppUserDoc, MemberApplicationDoc } from "@/server/models";
import { log } from "@/server/log";
import { rateLimit } from "@/server/rate-limit";
import { hashPhone, resolveReferrer } from "@/server/referral/resolve";
import { applicantSchema, idProofLast4 } from "@/lib/join/applicant-schema";
import { parseLeg } from "@/lib/join/leg";

/**
 * Resolve a raw `?ref=` value for the client-side join gate — just the sponsor's
 * public name + canonical code, nothing sensitive. Returns null when the value
 * doesn't match an eligible member.
 */
export async function lookupReferrerAction(
  raw: string,
): Promise<{ memberCode: string; sponsorName: string | null } | null> {
  if (!raw || raw.length > 40) return null;
  try {
    const r = await resolveReferrer(raw);
    return r ? { memberCode: r.memberCode, sponsorName: r.sponsorName } : null;
  } catch (err) {
    // Without this, a real failure (DB/credentials issue, etc.) looks
    // identical to "no such distributor" to the visitor and leaves no trace.
    log.error("lookupReferrerAction failed", { err: String(err) });
    return null;
  }
}

export type JoinFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "success" };

const schema = applicantSchema.extend({
  referrerInput: z.string().trim().min(3, "Enter your referrer's mobile number or AMA code"),
  sponsorConfirmed: z.literal("on", { message: "Please confirm your referrer" }),
  termsAccepted: z.literal("on", { message: "You must accept the Terms and Privacy Policy" }),
  captchaToken: z.string().optional().default(""),
});

export async function submitMemberApplicationAction(
  _prev: JoinFormState,
  formData: FormData,
): Promise<JoinFormState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  const userAgent = h.get("user-agent");

  const rl = rateLimit(`join:submit:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return { status: "error", message: `Too many attempts. Try again in ${rl.retryAfterSec}s.` };
  }

  const parsed = schema.safeParse({
    referrerInput: formData.get("referrerInput"),
    phone: formData.get("phone"),
    fullName: formData.get("fullName"),
    age: formData.get("age"),
    familyMemberCount: formData.get("familyMemberCount"),
    gender: formData.get("gender") ?? "",
    email: formData.get("email") ?? "",
    idProofType: formData.get("idProofType") ?? "",
    idProofValue: formData.get("idProofValue") ?? "",
    nomineeName: formData.get("nomineeName") ?? "",
    addressLine: formData.get("addressLine"),
    city: formData.get("city"),
    district: formData.get("district"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    sponsorConfirmed: formData.get("sponsorConfirmed") ?? "",
    termsAccepted: formData.get("termsAccepted") ?? "",
    captchaToken: formData.get("cf-turnstile-response") ?? "",
  });
  // The side an invite link asked for. Anything unrecognised is simply ignored —
  // it is only a preference, never a reason to reject the registration.
  const preferredLeg = parseLeg(String(formData.get("leg") ?? ""));

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      status: "error",
      message: first?.message ?? "Please check the form and try again.",
      fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "form"), i.message])),
    };
  }
  const data = parsed.data;

  const captchaOk = await verifyCaptcha(data.captchaToken || null, ip);
  if (!captchaOk) {
    return { status: "error", message: "Captcha check failed. Please try again." };
  }

  const referrer = await resolveReferrer(data.referrerInput);
  if (!referrer) {
    return {
      status: "error",
      message:
        "We couldn't find an active distributor with that mobile number or AMA code. Double-check it with whoever invited you and try again.",
      fieldErrors: { referrerInput: "No active distributor found for this number/code" },
    };
  }

  const phoneHash = hashPhone(data.phone);

  const [dupApplicationSnap, existingMemberSnap] = await Promise.all([
    db()
      .collection(Collections.memberApplications)
      .where("phoneHash", "==", phoneHash)
      .where("status", "in", ["PENDING", "ON_HOLD", "APPROVED"])
      .limit(1)
      .get(),
    db()
      .collection(Collections.appUsers)
      .where("phone", "in", [data.phone, `+91${data.phone}`, `91${data.phone}`])
      .limit(1)
      .get(),
  ]);
  const existingMember = existingMemberSnap.empty ? null : (existingMemberSnap.docs[0]!.data() as AppUserDoc);
  if (!dupApplicationSnap.empty || existingMember?.memberProfileId) {
    return {
      status: "error",
      message: "This mobile number is already registered. If you think this is a mistake, contact support.",
      fieldErrors: { phone: "Already registered" },
    };
  }

  try {
    const applicationData: MemberApplicationDoc = {
      referrerInput: data.referrerInput,
      sponsorId: referrer.sponsorId,
      sponsorCodeSnapshot: referrer.memberCode,
      fullName: data.fullName,
      phone: data.phone,
      phoneHash,
      email: data.email ?? null,
      age: data.age,
      gender: data.gender ?? null,
      familyMemberCount: data.familyMemberCount,
      idProofType: data.idProofType ?? null,
      idProofLast4: idProofLast4(data.idProofType, data.idProofValue),
      addressLine: data.addressLine,
      city: data.city,
      district: data.district,
      state: data.state,
      pincode: data.pincode,
      nomineeName: data.nomineeName ?? null,
      sponsorConfirmed: true,
      preferredLeg,
      termsAcceptedAt: nowSentinel(),
      consentIp: ip === "unknown" ? null : ip,
      consentUserAgent: userAgent,
      captchaVerifiedAt: nowSentinel(),
      source: "PUBLIC",
      createdByUserId: null,
      status: "PENDING",
      reviewedByUserId: null,
      reviewedAt: null,
      reviewNote: null,
      memberProfileId: null,
      createdAt: nowSentinel(),
      updatedAt: nowSentinel(),
    };

    // `phoneHash` is unique for the lifetime of the table under Postgres (even
    // against a REJECTED row) — replicated here via the same lock mechanism
    // every other unique field in the app uses. A collision throws
    // `UniqueConstraintError`, caught by this function's outer catch below.
    const newRef = db().collection(Collections.memberApplications).doc();
    await runUniqueTransaction([{ field: "memberApplication.phoneHash", value: phoneHash }], async (tx) => {
      tx.set(newRef, applicationData);
    });
    const createdId = newRef.id;

    const store = await cookies();
    store.set("amaasop_registered", "1", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    store.delete("amaasop_ref");
    store.delete("amaasop_leg");

    await writeAudit({
      actorUserId: null,
      action: "member_application.create",
      entity: "MemberApplication",
      entityId: createdId,
      after: {
        sponsorCode: referrer.memberCode,
        matchedBy: referrer.matchedBy,
        preferredLeg,
        city: data.city,
        state: data.state,
      },
    });

    log.info("member application submitted", { id: createdId, sponsorCode: referrer.memberCode });
    return { status: "success" };
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      return {
        status: "error",
        message: "This mobile number is already registered. If you think this is a mistake, contact support.",
        fieldErrors: { phone: "Already registered" },
      };
    }
    log.error("submitMemberApplicationAction failed", { err: String(err) });
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
