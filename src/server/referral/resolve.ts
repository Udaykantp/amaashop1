import "server-only";
import { createHmac } from "node:crypto";
import { Collections, db, doc } from "@/server/firestore";
import type { AppUserDoc, MemberProfileDoc } from "@/server/models";
import { env } from "@/server/env";
import { normalizeMemberCode } from "@/server/network/member-code";

/**
 * Referral-link identity resolution for the public `/join` funnel.
 *
 * A `?ref=` value (or a manually typed one) can be EITHER an `AMA-XXXXXX` member
 * code OR the sponsor's 10-digit mobile number — members share whichever they
 * find easier. Both resolve to the same sponsor `MemberProfile`.
 */

export type RefKind = "code" | "phone";

export interface NormalizedRef {
  kind: RefKind;
  /** `AMA-XXXXXX` for a code, the bare 10-digit string for a phone. */
  value: string;
}

/** Strip an Indian mobile number down to its 10 significant digits, or null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return null;
}

export function normalizeRef(input: string | null | undefined): NormalizedRef | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  const code = normalizeMemberCode(raw);
  if (code) return { kind: "code", value: code };

  const phone = normalizePhone(raw);
  if (phone) return { kind: "phone", value: phone };

  return null;
}

/** Keyed HMAC blind index for a normalized 10-digit phone (mirrors session.ts). */
export function hashPhone(phone10: string): string {
  return createHmac("sha256", env.blindIndexKey).update(`phone:${phone10}`).digest("base64url");
}

export interface ResolvedReferrer {
  sponsorId: string;
  memberCode: string;
  sponsorName: string | null;
  matchedBy: RefKind;
}

async function findMemberProfileByUserId(userId: string): Promise<{ id: string; data: MemberProfileDoc } | null> {
  const snap = await db().collection(Collections.memberProfiles).where("userId", "==", userId).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0]!.id, data: snap.docs[0]!.data() as MemberProfileDoc };
}

/**
 * Resolve a raw referral value to an eligible sponsor, or null. A sponsor is
 * eligible unless they are TERMINATED or frozen (their referral link is dead).
 */
export async function resolveReferrer(input: string | null | undefined): Promise<ResolvedReferrer | null> {
  const norm = normalizeRef(input);
  // Last resort: a raw string that isn't a valid phone and doesn't match the
  // strict AMA code shape may still be an exact member code (e.g. legacy /
  // seed codes). Try it as a code before giving up.
  const kind: RefKind = norm?.kind ?? "code";
  const value = norm?.value ?? (input ?? "").trim().toUpperCase();
  if (!value) return null;

  let profile: { id: string; data: MemberProfileDoc } | null = null;

  if (kind === "code") {
    const snap = await db().collection(Collections.memberProfiles).where("memberCode", "==", value).limit(1).get();
    if (!snap.empty) profile = { id: snap.docs[0]!.id, data: snap.docs[0]!.data() as MemberProfileDoc };
  } else {
    const userSnap = await db()
      .collection(Collections.appUsers)
      .where("phone", "in", [value, `+91${value}`, `91${value}`])
      .limit(1)
      .get();
    if (!userSnap.empty) profile = await findMemberProfileByUserId(userSnap.docs[0]!.id);
  }

  if (!profile) return null;
  const { data } = profile;
  if (data.terminatedAt || data.frozenAt || data.status === "TERMINATED") return null;

  const userSnap = await doc(Collections.appUsers, data.userId).get();
  const user = userSnap.exists ? (userSnap.data() as AppUserDoc) : null;

  return {
    sponsorId: profile.id,
    memberCode: data.memberCode,
    sponsorName: user?.displayName ?? null,
    matchedBy: kind,
  };
}
