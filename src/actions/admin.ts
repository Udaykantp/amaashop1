"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import type { UserRole } from "@/server/enums";
import { AuthError, requireAdmin, requireCapability } from "@/server/auth/guards";
import {
  beginImpersonation,
  endImpersonation,
  getCurrentUser,
  setMfaClaim,
  setUserRole,
} from "@/server/auth/session";
import { writeAudit } from "@/server/audit";
import { isAllowlistedSuperAdminEmail } from "@/server/auth/super-admin";
import { Collections, db, doc, nowSentinel } from "@/server/firestore";
import type { AppUserDoc, KycProfileDoc, MemberProfileDoc } from "@/server/models";
import { log } from "@/server/log";
import { CAPABILITIES } from "@/server/rbac";
import { MoveError, moveMemberSubtree, setMemberFrozen, terminateAndCompress } from "@/server/network/move";
import { adminEnrollDistributor, adminEnrollSchema } from "@/server/network/enroll";
import { deleteDistributor } from "@/server/network/delete";
import { NetworkError } from "@/server/network/genealogy";
import { findMemberByCodeOrPhone } from "@/server/network/lookup";
import { normalizePhone } from "@/server/referral/resolve";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  if (err instanceof MoveError) return { ok: false, error: err.message };
  if (err instanceof NetworkError) return { ok: false, error: err.message };
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Invalid input" };
  log.error("admin action failed", { err: String(err) });
  return { ok: false, error: "Something went wrong. Please try again." };
}

// ── Users & roles (SUPER_ADMIN only) ───────────────────────────────────────

const ROLES: UserRole[] = ["SUPER_ADMIN", "OPS_ADMIN", "FINANCE_ADMIN", "MEMBER", "CONSUMER"];

export async function setUserRoleAction(targetUserId: string, role: UserRole): Promise<ActionResult> {
  try {
    const actor = await requireAdmin("SUPER_ADMIN");
    if (!ROLES.includes(role)) throw new z.ZodError([]);
    if (targetUserId === actor.uid) {
      return { ok: false, error: "You can't change your own role." };
    }

    const beforeSnap = await doc(Collections.appUsers, targetUserId).get();
    if (!beforeSnap.exists) return { ok: false, error: "User not found." };
    const before = beforeSnap.data() as AppUserDoc;

    // SUPER_ADMIN can only be granted to an allow-listed e-mail. Without this
    // the role could be handed out here and then be inert (fail-closed) or,
    // worse, become live the moment an address is added to the allow-list.
    if (role === "SUPER_ADMIN" && !isAllowlistedSuperAdminEmail(before.email)) {
      return {
        ok: false,
        error: "Add this e-mail to SUPER_ADMIN_ALLOWLIST before assigning the Super Admin role.",
      };
    }

    await setUserRole(targetUserId, role); // Firestore + Firebase claim + token revoke
    await writeAudit({
      actorUserId: actor.uid,
      action: "user.role.update",
      entity: "app_user",
      entityId: targetUserId,
      before: { role: before.role },
      after: { role },
    });
    revalidatePath("/admin/users");
    return { ok: true, message: `${before.email ?? "User"} is now ${role}.` };
  } catch (err) {
    return fail(err);
  }
}

const statusSchema = z.enum(["ACTIVE", "SUSPENDED", "CLOSED"]);

export async function setUserStatusAction(
  targetUserId: string,
  status: z.infer<typeof statusSchema>,
): Promise<ActionResult> {
  try {
    const actor = await requireAdmin("SUPER_ADMIN");
    const parsed = statusSchema.parse(status);
    if (targetUserId === actor.uid) return { ok: false, error: "You can't change your own status." };

    const ref = doc(Collections.appUsers, targetUserId);
    const beforeSnap = await ref.get();
    if (!beforeSnap.exists) return { ok: false, error: "User not found." };
    const before = beforeSnap.data() as AppUserDoc;

    await ref.update({ status: parsed, updatedAt: nowSentinel() });
    await writeAudit({
      actorUserId: actor.uid,
      action: "user.status.update",
      entity: "app_user",
      entityId: targetUserId,
      before: { status: before.status },
      after: { status: parsed },
    });
    revalidatePath("/admin/users");
    return { ok: true, message: `Status set to ${parsed}.` };
  } catch (err) {
    return fail(err);
  }
}

// ── Commission rule versioning (SUPER_ADMIN only) ──────────────────────────

const ruleVersionSchema = z.object({
  name: z.string().trim().min(3, "Give this version a name"),
  effectiveFrom: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
  ruleJson: z.string().refine((s) => {
    try {
      JSON.parse(s);
      return true;
    } catch {
      return false;
    }
  }, "Rule JSON is not valid JSON"),
  note: z.string().trim().optional(),
});

/**
 * Create a NEW rule set version effective from a chosen date. The currently
 * ACTIVE set is closed off (`effectiveTo` = the new `effectiveFrom`) and
 * archived. Historical payouts stay bound to whichever set was effective when
 * their order confirmed — nothing is rewritten (brief §3.3).
 */
export async function createCommissionRuleVersionAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireAdmin("SUPER_ADMIN");
    const input = ruleVersionSchema.parse({
      name: formData.get("name"),
      effectiveFrom: formData.get("effectiveFrom"),
      ruleJson: formData.get("ruleJson"),
      note: formData.get("note") || undefined,
    });
    const effectiveFrom = new Date(input.effectiveFrom);
    const parsedJson = JSON.parse(input.ruleJson);

    const firestore = db();
    const newRef = firestore.collection(Collections.commissionRuleSets).doc();
    await firestore.runTransaction(async (tx) => {
      const currentSnap = await tx.get(
        firestore.collection(Collections.commissionRuleSets).where("status", "==", "ACTIVE").limit(1),
      );
      if (!currentSnap.empty) {
        const currentDoc = currentSnap.docs[0]!;
        const current = currentDoc.data() as import("@/server/models").CommissionRuleSetDoc;
        if (effectiveFrom <= current.effectiveFrom.toDate()) {
          throw new AuthError("New version must start after the current one.");
        }
        tx.update(currentDoc.ref, { status: "ARCHIVED", effectiveTo: Timestamp.fromDate(effectiveFrom) });
      }
      tx.set(newRef, {
        name: input.name,
        status: "ACTIVE",
        effectiveFrom: Timestamp.fromDate(effectiveFrom),
        effectiveTo: null,
        ruleJson: parsedJson,
        confirmPending: null,
        createdByUserId: actor.uid,
        note: input.note ?? null,
        createdAt: nowSentinel(),
      } satisfies import("@/server/models").CommissionRuleSetDoc);
    });

    await writeAudit({
      actorUserId: actor.uid,
      action: "commission_rule.create",
      entity: "commission_rule_set",
      entityId: newRef.id,
      after: { name: input.name, effectiveFrom, ruleJson: parsedJson },
    });
    revalidatePath("/admin/commission");
    return { ok: true, message: "New commission rule version is now active." };
  } catch (err) {
    return fail(err);
  }
}

// ── KYC review (OPS_ADMIN or SUPER_ADMIN) ─────────────────────────────────

export async function approveKycAction(userId: string): Promise<ActionResult> {
  try {
    const actor = await requireAdmin("SUPER_ADMIN", "OPS_ADMIN");
    const kycRef = doc(Collections.kycProfiles, userId);
    const beforeSnap = await kycRef.get();
    if (!beforeSnap.exists) return { ok: false, error: "No KYC submission for this user." };
    const before = beforeSnap.data() as KycProfileDoc;

    const firestore = db();
    await firestore.runTransaction(async (tx) => {
      const memberSnap = await tx.get(
        firestore.collection(Collections.memberProfiles).where("userId", "==", userId).where("status", "==", "PENDING_KYC").limit(1),
      );
      tx.update(kycRef, {
        status: "APPROVED",
        reviewedByUserId: actor.uid,
        reviewedAt: nowSentinel(),
        rejectionReason: null,
      } satisfies Partial<KycProfileDoc>);
      if (!memberSnap.empty) {
        tx.update(memberSnap.docs[0]!.ref, { status: "ACTIVE" } satisfies Partial<MemberProfileDoc>);
      }
    });

    await writeAudit({
      actorUserId: actor.uid,
      action: "kyc.approve",
      entity: "kyc_profile",
      entityId: userId,
      before: { status: before.status },
      after: { status: "APPROVED" },
    });
    revalidatePath("/admin/kyc");
    return { ok: true, message: "KYC approved." };
  } catch (err) {
    return fail(err);
  }
}

const rejectSchema = z.object({ userId: z.string(), reason: z.string().trim().min(4, "Give a reason") });

export async function rejectKycAction(userId: string, reason: string): Promise<ActionResult> {
  try {
    const actor = await requireAdmin("SUPER_ADMIN", "OPS_ADMIN");
    const input = rejectSchema.parse({ userId, reason });
    const ref = doc(Collections.kycProfiles, input.userId);
    const beforeSnap = await ref.get();
    if (!beforeSnap.exists) return { ok: false, error: "No KYC submission for this user." };
    const before = beforeSnap.data() as KycProfileDoc;

    await ref.update({
      status: "REJECTED",
      reviewedByUserId: actor.uid,
      reviewedAt: nowSentinel(),
      rejectionReason: input.reason,
    } satisfies Partial<KycProfileDoc>);
    await writeAudit({
      actorUserId: actor.uid,
      action: "kyc.reject",
      entity: "kyc_profile",
      entityId: input.userId,
      before: { status: before.status },
      after: { status: "REJECTED", reason: input.reason },
    });
    revalidatePath("/admin/kyc");
    return { ok: true, message: "KYC rejected — the member has been notified." };
  } catch (err) {
    return fail(err);
  }
}

// ── Enrol a distributor (member.create) ───────────────────────────────────

export type CreateDistributorResult =
  | {
      ok: true;
      memberId: string;
      memberCode: string;
      resetLink: string | null;
      createdNewAccount: boolean;
      placedUnderCode: string | null;
      leg: "LEFT" | "RIGHT" | null;
      spilledOver: boolean;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Admin-side enrolment — deliberately minimal. Referrer (mobile or AMA code) +
 * the distributor's name + mobile (+ optional e-mail). Places them under the
 * sponsor and auto-generates their referral code so they can use the store
 * immediately; KYC / address are collected from the distributor later, exactly
 * like a public sign-up. See `adminEnrollDistributor`.
 */
export async function createDistributorAction(formData: FormData): Promise<CreateDistributorResult> {
  try {
    const actor = await requireCapability("member.create");

    const parsed = adminEnrollSchema.safeParse({
      referrerInput: formData.get("referrerInput"),
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
      email: formData.get("email") ?? "",
      leg: formData.get("leg") ?? "AUTO",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
        fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "form"), i.message])),
      };
    }

    const result = await adminEnrollDistributor({ data: parsed.data, actorUserId: actor.uid });

    await writeAudit({
      actorUserId: actor.uid,
      action: "member.create",
      entity: "member_profile",
      entityId: result.memberProfileId,
      after: {
        memberCode: result.memberCode,
        source: "ADMIN",
        email: parsed.data.email ?? null,
        sponsorInput: parsed.data.referrerInput,
        legPreference: parsed.data.leg,
        placedUnder: result.placedUnderCode,
        leg: result.leg,
        createdNewAccount: result.createdNewAccount,
      },
    });
    revalidatePath("/admin/members");
    return {
      ok: true,
      memberId: result.memberProfileId,
      memberCode: result.memberCode,
      resetLink: result.resetLink,
      createdNewAccount: result.createdNewAccount,
      placedUnderCode: result.placedUnderCode,
      leg: result.leg,
      spilledOver: result.spilledOver,
    };
  } catch (err) {
    return fail(err);
  }
}

// ── Genealogy control center (network.move — strict 2FA + audit) ───────────

const moveSchema = z.object({
  memberId: z.string().min(1),
  newParentInput: z.string().trim().min(3, "Enter the new parent's mobile number or AMA code"),
  leg: z.enum(["LEFT", "RIGHT"], { message: "Choose left or right" }),
});

/**
 * Manual node placement: re-place a distributor (and their whole team) into the
 * left or right slot under a different parent. The slot must be empty. Only the
 * tree position changes — the referral sponsor is untouched. Requires a real
 * second factor and writes a full before/after audit row (RBAC spec §3).
 *
 * `newParentInput` is what the admin typed — an `AMA-XXXXXX` code or a mobile
 * number — resolved to the parent's Firestore profile id here, since that's what
 * `moveMemberSubtree` operates on.
 */
export async function moveMemberAction(memberId: string, newParentInput: string, leg: "LEFT" | "RIGHT"): Promise<ActionResult> {
  try {
    const actor = await requireCapability("network.move", { strict2fa: true });
    const input = moveSchema.parse({ memberId, newParentInput, leg });

    const beforeSnap = await doc(Collections.memberProfiles, input.memberId).get();
    if (!beforeSnap.exists) return { ok: false, error: "Member not found." };
    const before = beforeSnap.data() as MemberProfileDoc;
    const beforeParent = before.placementParentId ? await doc(Collections.memberProfiles, before.placementParentId).get() : null;
    const beforeParentCode = beforeParent?.exists ? (beforeParent.data() as MemberProfileDoc).memberCode : null;

    const newParent = await findMemberByCodeOrPhone(input.newParentInput);
    if (!newParent) return { ok: false, error: "No distributor matches that mobile number or code." };

    const result = await moveMemberSubtree(input.memberId, newParent.id, input.leg);

    await writeAudit({
      actorUserId: actor.uid,
      action: "network.move",
      entity: "member_profile",
      entityId: input.memberId,
      before: { placementParentId: before.placementParentId ?? null, parentCode: beforeParentCode, leg: before.leg ?? null },
      after: { placementParentId: newParent.id, parentCode: newParent.data.memberCode, leg: input.leg, subtreeSize: result.subtreeSize },
    });
    revalidatePath("/admin/network");
    revalidatePath(`/admin/members/${input.memberId}`);
    return {
      ok: true,
      message: `Moved ${before.memberCode} (+${result.subtreeSize - 1} team) to ${newParent.data.memberCode}'s ${input.leg.toLowerCase()} leg.`,
    };
  } catch (err) {
    return fail(err);
  }
}

// ── Freeze / terminate (network.freeze / network.terminate) ───────────────

export async function setMemberFrozenAction(memberId: string, frozen: boolean, reason: string): Promise<ActionResult> {
  try {
    const actor = await requireCapability("network.freeze");
    if (frozen && reason.trim().length < 4) {
      return { ok: false, error: "Give a reason for the freeze." };
    }

    await setMemberFrozen(memberId, frozen, frozen ? reason.trim() : null);
    await writeAudit({
      actorUserId: actor.uid,
      action: frozen ? "member.freeze" : "member.unfreeze",
      entity: "member_profile",
      entityId: memberId,
      after: { frozen, reason: frozen ? reason.trim() : null },
    });
    revalidatePath(`/admin/members/${memberId}`);
    return { ok: true, message: frozen ? "Distributor frozen." : "Freeze lifted." };
  } catch (err) {
    return fail(err);
  }
}

export async function terminateMemberAction(memberId: string, reason: string): Promise<ActionResult> {
  try {
    const actor = await requireCapability("network.terminate", { strict2fa: true });
    if (reason.trim().length < 4) return { ok: false, error: "Give a reason for termination." };

    const beforeSnap = await doc(Collections.memberProfiles, memberId).get();
    if (!beforeSnap.exists) return { ok: false, error: "Member not found." };
    const before = beforeSnap.data() as MemberProfileDoc;
    const beforeSponsor = before.sponsorId ? await doc(Collections.memberProfiles, before.sponsorId).get() : null;
    const beforeSponsorCode = beforeSponsor?.exists ? (beforeSponsor.data() as MemberProfileDoc).memberCode : null;

    const result = await terminateAndCompress(memberId, reason.trim());
    await writeAudit({
      actorUserId: actor.uid,
      action: "member.terminate",
      entity: "member_profile",
      entityId: memberId,
      before: { memberCode: before.memberCode, sponsorCode: beforeSponsorCode, leg: before.leg ?? null },
      after: { compressedInto: result.compressedIntoId, liftedChildren: result.liftedChildren, reason: reason.trim() },
    });
    revalidatePath("/admin/network");
    revalidatePath(`/admin/members/${memberId}`);
    return {
      ok: true,
      message: `${before.memberCode} terminated; their team moved up to fill the position.`,
    };
  } catch (err) {
    return fail(err);
  }
}

// ── Delete a distributor (member.delete) ──────────────────────────────────

/**
 * Permanently delete a distributor. One click + a confirm. The server allows it
 * **only** for an account with no downline and no financial/store history (a
 * mistaken or duplicate enrolment) — anything with history is refused with a
 * message pointing to Terminate. The login account goes too when it has no
 * separate customer activity, otherwise it is downgraded to a normal customer.
 */
export async function deleteDistributorAction(memberId: string): Promise<ActionResult> {
  try {
    const actor = await requireCapability("member.delete");

    const memberSnap = await doc(Collections.memberProfiles, memberId).get();
    if (!memberSnap.exists) return { ok: false, error: "Distributor not found." };
    const member = memberSnap.data() as MemberProfileDoc;
    const userSnap = await doc(Collections.appUsers, member.userId).get();
    const userEmail = userSnap.exists ? (userSnap.data() as AppUserDoc).email : null;

    const result = await deleteDistributor({ memberId, actorUserId: actor.uid });

    await writeAudit({
      actorUserId: actor.uid,
      action: "member.delete",
      entity: "member_profile",
      entityId: memberId,
      before: { memberCode: result.memberCode, email: userEmail },
      after: { deleted: true, loginDeleted: result.loginDeleted, application: result.applicationHandled },
    });

    revalidatePath("/admin/members");
    revalidatePath("/admin/applications");
    return {
      ok: true,
      message: result.loginDeleted
        ? `Distributor ${result.memberCode} was permanently deleted.`
        : `Distributor ${result.memberCode} was removed (their login stays as a customer account).`,
    };
  } catch (err) {
    return fail(err);
  }
}

// ── "Login As" impersonation (member.impersonate) ─────────────────────────

export async function startImpersonationAction(targetUserId: string): Promise<ActionResult> {
  try {
    const actor = await requireCapability("member.impersonate");
    const targetSnap = await doc(Collections.appUsers, targetUserId).get();
    if (!targetSnap.exists) return { ok: false, error: "User not found." };
    const target = targetSnap.data() as AppUserDoc;
    if (target.role === "SUPER_ADMIN") {
      return { ok: false, error: "Can't impersonate a Super Admin." };
    }

    await beginImpersonation(actor.uid, targetUserId);
    await writeAudit({
      actorUserId: actor.uid,
      action: "member.impersonate.start",
      entity: "app_user",
      entityId: targetUserId,
      after: { targetEmail: target.email },
    });
  } catch (err) {
    return fail(err);
  }
  redirect("/member");
}

export async function stopImpersonationAction(): Promise<void> {
  const current = await getCurrentUser();
  await endImpersonation();
  if (current?.impersonatedBy) {
    await writeAudit({
      actorUserId: current.impersonatedBy.uid,
      action: "member.impersonate.stop",
      entity: "app_user",
      entityId: current.uid,
    });
  }
  redirect("/admin/members");
}

// ── Password reset (member.passwordReset) ─────────────────────────────────

export async function sendPasswordResetAction(targetUserId: string): Promise<ActionResult> {
  try {
    const actor = await requireCapability("member.passwordReset");
    const targetSnap = await doc(Collections.appUsers, targetUserId).get();
    const email = targetSnap.exists ? (targetSnap.data() as AppUserDoc).email : null;
    if (!email) return { ok: false, error: "User has no email on file." };

    const { adminAuth } = await import("@/server/auth/admin");
    const link = await adminAuth().generatePasswordResetLink(email);
    await writeAudit({
      actorUserId: actor.uid,
      action: "member.passwordReset",
      entity: "app_user",
      entityId: targetUserId,
      after: { email },
    });
    return { ok: true, message: `Reset link generated: ${link}` };
  } catch (err) {
    return fail(err);
  }
}

// ── Contact details (member.edit) ──────────────────────────────────────────

const updatePhoneSchema = z.object({
  userId: z.string().min(1),
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v) ?? "")
    .refine((v) => v.length === 10, "Enter a valid 10-digit mobile number"),
});

/**
 * Add or correct a distributor's mobile number. Exists mainly to fix up
 * accounts that ended up without one (demo seed data, an old enrolment path,
 * etc.) — a distributor with no phone on file can still be found by AMA code,
 * but not by mobile number, on the /join referrer check.
 */
export async function updateMemberPhoneAction(userId: string, phone: string): Promise<ActionResult> {
  try {
    const actor = await requireCapability("member.edit");
    const input = updatePhoneSchema.parse({ userId, phone });

    const ref = doc(Collections.appUsers, input.userId);
    const beforeSnap = await ref.get();
    if (!beforeSnap.exists) return { ok: false, error: "User not found." };
    const before = beforeSnap.data() as AppUserDoc;

    const dupSnap = await db()
      .collection(Collections.appUsers)
      .where("phone", "in", [input.phone, `+91${input.phone}`, `91${input.phone}`])
      .limit(1)
      .get();
    if (!dupSnap.empty && dupSnap.docs[0]!.id !== input.userId) {
      return { ok: false, error: "This mobile number already belongs to another account." };
    }

    await ref.update({ phone: input.phone, updatedAt: nowSentinel() });
    await writeAudit({
      actorUserId: actor.uid,
      action: "member.phone.update",
      entity: "app_user",
      entityId: input.userId,
      before: { phone: before.phone },
      after: { phone: input.phone },
    });
    revalidatePath("/admin/members");
    return { ok: true, message: "Phone number updated." };
  } catch (err) {
    return fail(err);
  }
}

// ── Custom sub-roles: per-user capability grants (users.manage) ────────────

const capsSchema = z.object({
  userId: z.string().min(1),
  extra: z.array(z.enum(CAPABILITIES)).max(64),
  denied: z.array(z.enum(CAPABILITIES)).max(64),
});

export async function setUserCapabilitiesAction(userId: string, extra: string[], denied: string[]): Promise<ActionResult> {
  try {
    const actor = await requireCapability("users.manage");
    const input = capsSchema.parse({ userId, extra, denied });
    if (userId === actor.uid) return { ok: false, error: "You can't edit your own permissions." };

    const ref = doc(Collections.appUsers, input.userId);
    const beforeSnap = await ref.get();
    if (!beforeSnap.exists) return { ok: false, error: "User not found." };
    const before = beforeSnap.data() as AppUserDoc;

    await ref.update({ extraCapabilities: input.extra, deniedCapabilities: input.denied, updatedAt: nowSentinel() });
    await writeAudit({
      actorUserId: actor.uid,
      action: "user.capabilities.update",
      entity: "app_user",
      entityId: input.userId,
      before: { extraCapabilities: before.extraCapabilities, deniedCapabilities: before.deniedCapabilities },
      after: { extraCapabilities: input.extra, deniedCapabilities: input.denied },
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "Permissions updated." };
  } catch (err) {
    return fail(err);
  }
}

export async function setMfaClaimAction(userId: string, mfa: boolean): Promise<ActionResult> {
  try {
    const actor = await requireAdmin("SUPER_ADMIN");
    await setMfaClaim(userId, mfa);
    await writeAudit({
      actorUserId: actor.uid,
      action: "user.mfa.set",
      entity: "app_user",
      entityId: userId,
      after: { mfa },
    });
    revalidatePath("/admin/users");
    return { ok: true, message: `2FA claim ${mfa ? "set" : "cleared"} (user must re-authenticate).` };
  } catch (err) {
    return fail(err);
  }
}
