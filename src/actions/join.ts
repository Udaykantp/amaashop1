"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { applicantSchema } from "@/lib/join/applicant-schema";
import { parseLeg } from "@/lib/join/leg";

// DATABASE COMMENTED OUT — USING MOCK DATA
/*
import { writeAudit } from "@/server/audit";
import { verifyCaptcha } from "@/server/captcha";
import { Collections, db, nowSentinel, runUniqueTransaction, UniqueConstraintError } from "@/server/firestore";
import type { AppUserDoc, MemberApplicationDoc } from "@/server/models";
import { log } from "@/server/log";
import { rateLimit } from "@/server/rate-limit";
import { hashPhone, resolveReferrer } from "@/server/referral/resolve";
*/

export async function lookupReferrerAction(
  raw: string,
): Promise<{ memberCode: string; sponsorName: string | null } | null> {
  if (!raw || raw.length > 40) return null;
  const clean = raw.trim().toUpperCase();
  const code = clean.startsWith("AMA-") ? clean : `AMA-${clean}`;
  return {
    memberCode: code,
    sponsorName: "Sunita Devi (AmaaShop Leader)",
  };
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

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      status: "error",
      message: first?.message ?? "Please check the form and try again.",
      fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "form"), i.message])),
    };
  }

  const store = await cookies();
  store.set("amaasop_registered", "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  store.delete("amaasop_ref");
  store.delete("amaasop_leg");

  return { status: "success" };
}
