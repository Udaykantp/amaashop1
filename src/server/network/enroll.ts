import "server-only";
import { z } from "zod";
import { Collections, db, doc } from "@/server/firestore";
import type { AppUserDoc, MemberProfileDoc } from "@/server/models";
import { NetworkError } from "@/server/network/genealogy";
import { provisionMemberFromApplication } from "@/server/network/admin-create";
import { hashPhone, normalizePhone, resolveReferrer } from "@/server/referral/resolve";

/**
 * Admin "enrol a distributor" — kept deliberately minimal. The operator enters
 * only who referred the person and the person's name + mobile (+ optional
 * e-mail). The distributor's own referral code is generated automatically and
 * they can use the store straight away; full KYC / address is collected later
 * from the distributor, exactly like a public sign-up.
 */
export const adminEnrollSchema = z.object({
  referrerInput: z
    .string()
    .trim()
    .min(3, "Enter the referrer's mobile number or AMA code"),
  fullName: z
    .string()
    .trim()
    .regex(/^[A-Za-z][A-Za-z .'-]{1,79}$/, "Enter the distributor's full name (letters only)"),
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v) ?? "")
    .refine((v) => v.length === 10, "Enter a valid 10-digit mobile number"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  /** Which side of the referrer to grow. AUTO feeds their weaker leg. */
  leg: z.enum(["AUTO", "LEFT", "RIGHT"]).default("AUTO"),
});

export type AdminEnrollInput = z.infer<typeof adminEnrollSchema>;

export interface AdminEnrollResult {
  memberProfileId: string;
  memberCode: string;
  /** One-time password-reset link, when a brand-new account was created with an e-mail. */
  resetLink: string | null;
  createdNewAccount: boolean;
  /** Where they landed: the member they sit directly under, and which side. */
  placedUnderCode: string | null;
  leg: "LEFT" | "RIGHT" | null;
  /** True when that is not the referrer — the referrer's slot was full, so they spilled over. */
  spilledOver: boolean;
}

export async function adminEnrollDistributor(args: {
  data: AdminEnrollInput;
  actorUserId: string;
}): Promise<AdminEnrollResult> {
  const { data } = args;

  const referrer = await resolveReferrer(data.referrerInput);
  if (!referrer) {
    throw new NetworkError(
      "That referrer's mobile number or AMA code doesn't match an active distributor.",
      "SPONSOR_NOT_FOUND",
    );
  }

  // Reject a mobile that already belongs to a distributor or a pending /join lead.
  const phoneHash = hashPhone(data.phone);
  const [pendingLeadSnap, phoneOwnerSnap] = await Promise.all([
    db()
      .collection(Collections.memberApplications)
      .where("phoneHash", "==", phoneHash)
      .where("status", "in", ["PENDING", "ON_HOLD"])
      .limit(1)
      .get(),
    db()
      .collection(Collections.appUsers)
      .where("phone", "in", [data.phone, `+91${data.phone}`, `91${data.phone}`])
      .limit(1)
      .get(),
  ]);
  const phoneOwner = phoneOwnerSnap.empty ? null : (phoneOwnerSnap.docs[0]!.data() as AppUserDoc);
  if (phoneOwner?.memberProfileId) {
    throw new NetworkError("This mobile number already belongs to a distributor.", "ALREADY_MEMBER");
  }
  if (!pendingLeadSnap.empty) {
    throw new NetworkError(
      "This mobile number has a pending registration in the queue — approve that instead.",
      "ALREADY_MEMBER",
    );
  }

  // Account creation + genealogy placement + code generation are shared with the
  // public-funnel approval path; `seedKyc: false` keeps KYC at NOT_SUBMITTED so
  // the distributor completes it themselves later.
  const provisioned = await provisionMemberFromApplication({
    fullName: data.fullName,
    phone: data.phone,
    email: data.email ?? null,
    sponsorCode: referrer.memberCode,
    idProofType: null,
    idProofLast4: null,
    consentAcceptedAt: null,
    seedKyc: false,
    preferredLeg: data.leg,
  });

  const parentSnap = provisioned.placementParentId ? await doc(Collections.memberProfiles, provisioned.placementParentId).get() : null;

  return {
    memberProfileId: provisioned.memberProfileId,
    memberCode: provisioned.memberCode,
    resetLink: provisioned.signInLink ?? provisioned.resetLink,
    createdNewAccount: provisioned.createdNewAccount,
    placedUnderCode: parentSnap?.exists ? (parentSnap.data() as MemberProfileDoc).memberCode : null,
    leg: provisioned.leg,
    spilledOver: provisioned.placementParentId !== referrer.sponsorId,
  };
}
