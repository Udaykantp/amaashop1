"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, requireCapability } from "@/server/auth/guards";
import { writeAudit } from "@/server/audit";
import { Collections, doc, nowSentinel } from "@/server/firestore";
import type { MemberApplicationDoc } from "@/server/models";
import { log } from "@/server/log";
import { provisionMemberFromApplication } from "@/server/network/admin-create";
import { NetworkError } from "@/server/network/genealogy";

export type ApplicationActionResult =
  | { ok: true; message: string; memberId?: string; signInLink?: string | null }
  | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  if (err instanceof NetworkError) return { ok: false, error: err.message };
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Invalid input" };
  log.error("application action failed", { err: String(err) });
  return { ok: false, error: "Something went wrong. Please try again." };
}

const noteSchema = z.string().trim().max(500).optional();
const reasonSchema = z.string().trim().min(4, "Give a short reason").max(500);

/**
 * Approve a `/join` application: provision the real distributor account + tree
 * position, then mark the application APPROVED with a link to the new member.
 * Irreversible — requires a real second factor (`strict2fa`).
 */
export async function approveApplicationAction(
  id: string,
  note?: string,
  side: "AUTO" | "LEFT" | "RIGHT" = "AUTO",
): Promise<ApplicationActionResult> {
  try {
    const actor = await requireCapability("application.review", { strict2fa: true });
    const reviewNote = noteSchema.parse(note);
    const preferredLeg = z.enum(["AUTO", "LEFT", "RIGHT"]).parse(side);

    const ref = doc(Collections.memberApplications, id);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "Application not found." };
    const app = snap.data() as MemberApplicationDoc;
    if (app.status === "APPROVED") return { ok: false, error: "This application is already approved." };
    if (app.status === "REJECTED") return { ok: false, error: "Rejected applications can't be approved." };
    if (!app.sponsorCodeSnapshot) {
      return { ok: false, error: "No valid sponsor is recorded on this application." };
    }

    const provisioned = await provisionMemberFromApplication({
      fullName: app.fullName,
      phone: app.phone,
      email: app.email,
      sponsorCode: app.sponsorCodeSnapshot,
      idProofType: app.idProofType,
      idProofLast4: app.idProofLast4,
      consentAcceptedAt: app.termsAcceptedAt?.toDate() ?? null,
      preferredLeg,
    });

    await ref.update({
      status: "APPROVED",
      memberProfileId: provisioned.memberProfileId,
      reviewedByUserId: actor.uid,
      reviewedAt: nowSentinel(),
      reviewNote: reviewNote || null,
    } satisfies Partial<MemberApplicationDoc>);

    await writeAudit({
      actorUserId: actor.uid,
      action: "member_application.approve",
      entity: "MemberApplication",
      entityId: id,
      before: { status: app.status },
      after: {
        status: "APPROVED",
        memberCode: provisioned.memberCode,
        memberProfileId: provisioned.memberProfileId,
        placementParentId: provisioned.placementParentId,
        leg: provisioned.leg,
        requestedSide: app.preferredLeg ?? null,
        chosenSide: preferredLeg,
        note: reviewNote || null,
      },
    });

    revalidatePath("/admin/applications");
    revalidatePath(`/admin/applications/${id}`);
    revalidatePath("/admin/members");

    return {
      ok: true,
      message: `Approved — distributor ${provisioned.memberCode} created.`,
      memberId: provisioned.memberProfileId,
      signInLink: provisioned.signInLink,
    };
  } catch (err) {
    return fail(err);
  }
}

async function setStatus(
  id: string,
  status: "REJECTED" | "ON_HOLD",
  reason: string,
  action: string,
): Promise<ApplicationActionResult> {
  const actor = await requireCapability("application.review");
  const parsed = reasonSchema.parse(reason);

  const ref = doc(Collections.memberApplications, id);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Application not found." };
  const app = snap.data() as MemberApplicationDoc;
  if (app.status === "APPROVED") {
    return { ok: false, error: "This application is already approved and provisioned." };
  }

  await ref.update({
    status,
    reviewedByUserId: actor.uid,
    reviewedAt: nowSentinel(),
    reviewNote: parsed,
  } satisfies Partial<MemberApplicationDoc>);

  await writeAudit({
    actorUserId: actor.uid,
    action,
    entity: "MemberApplication",
    entityId: id,
    before: { status: app.status },
    after: { status, reason: parsed },
  });

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${id}`);
  return { ok: true, message: status === "REJECTED" ? "Application rejected." : "Application put on hold." };
}

export async function rejectApplicationAction(id: string, reason: string): Promise<ApplicationActionResult> {
  try {
    return await setStatus(id, "REJECTED", reason, "member_application.reject");
  } catch (err) {
    return fail(err);
  }
}

/**
 * Send a rejected or on-hold application back to the PENDING queue. An approved
 * (provisioned) application can't be reopened — the distributor already exists.
 */
export async function reopenApplicationAction(id: string, reason: string): Promise<ApplicationActionResult> {
  try {
    const actor = await requireCapability("application.review");
    const parsed = reasonSchema.parse(reason);

    const ref = doc(Collections.memberApplications, id);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "Application not found." };
    const app = snap.data() as MemberApplicationDoc;
    if (app.status === "APPROVED" || app.memberProfileId) {
      return { ok: false, error: "An approved application can't be reopened." };
    }
    if (app.status === "PENDING") {
      return { ok: false, error: "This application is already in the pending queue." };
    }

    await ref.update({
      status: "PENDING",
      reviewedByUserId: actor.uid,
      reviewedAt: nowSentinel(),
      reviewNote: parsed,
    } satisfies Partial<MemberApplicationDoc>);

    await writeAudit({
      actorUserId: actor.uid,
      action: "member_application.reopen",
      entity: "MemberApplication",
      entityId: id,
      before: { status: app.status },
      after: { status: "PENDING", reason: parsed },
    });

    revalidatePath("/admin/applications");
    revalidatePath(`/admin/applications/${id}`);
    return { ok: true, message: "Application reopened — it's back in the pending queue." };
  } catch (err) {
    return fail(err);
  }
}

export async function holdApplicationAction(id: string, reason: string): Promise<ApplicationActionResult> {
  try {
    return await setStatus(id, "ON_HOLD", reason, "member_application.hold");
  } catch (err) {
    return fail(err);
  }
}
