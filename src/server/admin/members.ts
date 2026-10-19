import "server-only";
import { Collections, db } from "@/server/firestore";
import type { AppUserDoc, KycProfileDoc, MemberProfileDoc } from "@/server/models";
import { getDownlineLevelSummary, getNetworkTotals, getUplineChain } from "@/server/network/genealogy";
import { getLegCounts } from "@/server/network/binary-tree";
import { findMemberByCodeOrPhone } from "@/server/network/lookup";

export interface MemberListRow {
  id: string;
  memberCode: string;
  name: string;
  email: string | null;
  status: string;
  kycStatus: string;
  /** Who referred them. */
  sponsorCode: string | null;
  /** People they personally referred. */
  directCount: number;
  /** Who they sit directly under in the binary tree, and on which side. */
  placedUnderCode: string | null;
  leg: "LEFT" | "RIGHT" | null;
  /** True until the network has been converted to the binary plan. */
  binary: boolean;
  leftCount: number;
  rightCount: number;
  joinedAt: string;
}

/**
 * Firestore has no cross-field, case-insensitive `contains` search the way
 * Postgres did. For the modest member counts this app has today, a text
 * search over-fetches a bounded batch and filters in memory instead of a
 * true server-side search index — fine at this scale, worth revisiting
 * (e.g. Algolia/Typesense sync) if the roster grows into the tens of thousands.
 */
const SEARCH_SCAN_LIMIT = 1000;

export async function listMembers(opts: { q?: string; skip?: number; take?: number } = {}) {
  const take = Math.min(opts.take ?? 30, 100);
  const skip = opts.skip ?? 0;
  const q = opts.q?.trim().toLowerCase();
  // a typed mobile number may carry +91 / spaces / dashes — compare on digits
  const qDigits = q?.replace(/D/g, "") ?? "";
  const firestore = db();

  let profiles: { id: string; data: MemberProfileDoc }[];
  let total: number;

  if (q) {
    const snap = await firestore.collection(Collections.memberProfiles).orderBy("joinedAt", "desc").limit(SEARCH_SCAN_LIMIT).get();
    const all = snap.docs.map((d) => ({ id: d.id, data: d.data() as MemberProfileDoc }));
    const userIds = [...new Set(all.map((p) => p.data.userId))];
    const userSnaps = userIds.length ? await firestore.getAll(...userIds.map((id) => firestore.collection(Collections.appUsers).doc(id))) : [];
    const usersByUid = new Map(userSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));
    const matched = all.filter((p) => {
      const u = usersByUid.get(p.data.userId);
      return (
        p.data.memberCode.toLowerCase().includes(q) ||
        u?.email?.toLowerCase().includes(q) ||
        (qDigits.length >= 4 && u?.phone?.replace(/D/g, "").endsWith(qDigits.slice(-10))) ||
        u?.displayName?.toLowerCase().includes(q)
      );
    });
    total = matched.length;
    profiles = matched.slice(skip, skip + take);
  } else {
    const [snap, countSnap] = await Promise.all([
      firestore.collection(Collections.memberProfiles).orderBy("joinedAt", "desc").offset(skip).limit(take).get(),
      firestore.collection(Collections.memberProfiles).count().get(),
    ]);
    profiles = snap.docs.map((d) => ({ id: d.id, data: d.data() as MemberProfileDoc }));
    total = countSnap.data().count;
  }

  const userIds = [...new Set(profiles.map((p) => p.data.userId))];
  const sponsorIds = [
    ...new Set(profiles.flatMap((p) => [p.data.sponsorId, p.data.placementParentId]).filter((x): x is string => !!x)),
  ];
  const [userSnaps, kycSnaps, sponsorSnaps, directCounts, legCounts] = await Promise.all([
    userIds.length ? firestore.getAll(...userIds.map((id) => firestore.collection(Collections.appUsers).doc(id))) : [],
    userIds.length ? firestore.getAll(...userIds.map((id) => firestore.collection(Collections.kycProfiles).doc(id))) : [],
    sponsorIds.length ? firestore.getAll(...sponsorIds.map((id) => firestore.collection(Collections.memberProfiles).doc(id))) : [],
    Promise.all(
      profiles.map((p) => firestore.collection(Collections.memberProfiles).where("sponsorId", "==", p.id).count().get()),
    ),
    getLegCounts(profiles.map((p) => p.id)),
  ]);
  const usersByUid = new Map(userSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));
  const kycByUid = new Map(kycSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as KycProfileDoc]));
  const sponsorsById = new Map(sponsorSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as MemberProfileDoc]));

  const list: MemberListRow[] = profiles.map((p, i) => {
    const user = usersByUid.get(p.data.userId);
    return {
      id: p.id,
      memberCode: p.data.memberCode,
      name: user?.displayName ?? "—",
      email: user?.email ?? null,
      status: p.data.status,
      kycStatus: kycByUid.get(p.data.userId)?.status ?? "NOT_SUBMITTED",
      sponsorCode: p.data.sponsorId ? (sponsorsById.get(p.data.sponsorId)?.memberCode ?? null) : null,
      directCount: directCounts[i]!.data().count,
      placedUnderCode: p.data.placementParentId ? (sponsorsById.get(p.data.placementParentId)?.memberCode ?? null) : null,
      leg: p.data.leg ?? null,
      binary: p.data.placementStrategy === "BINARY",
      leftCount: legCounts.get(p.id)?.left ?? 0,
      rightCount: legCounts.get(p.id)?.right ?? 0,
      joinedAt: p.data.joinedAt.toDate().toISOString(),
    };
  });

  return { list, total, take };
}

/**
 * Resolve whatever an admin typed into the genealogy search box to one member:
 * an AMA referral code or a mobile number first (exact), then a name / e-mail
 * fragment as a fallback. Returns the member's profile id, or null.
 */
export async function findMemberIdForAdmin(input: string): Promise<string | null> {
  const exact = await findMemberByCodeOrPhone(input);
  if (exact) return exact.id;
  return (await listMembers({ q: input, take: 1 })).list[0]?.id ?? null;
}

export async function getMemberDetail(id: string) {
  const firestore = db();
  const memberSnap = await firestore.collection(Collections.memberProfiles).doc(id).get();
  if (!memberSnap.exists) return null;
  const member = memberSnap.data() as MemberProfileDoc;

  const [userSnap, sponsorSnap, placementParentSnap, kycSnap, walletSnap, upline, levels, totals] = await Promise.all([
    firestore.collection(Collections.appUsers).doc(member.userId).get(),
    member.sponsorId ? firestore.collection(Collections.memberProfiles).doc(member.sponsorId).get() : Promise.resolve(null),
    member.placementParentId
      ? firestore.collection(Collections.memberProfiles).doc(member.placementParentId).get()
      : Promise.resolve(null),
    firestore.collection(Collections.kycProfiles).doc(member.userId).get(),
    firestore.collection(Collections.wallets).doc(member.userId).get(),
    getUplineChain(id, 20),
    getDownlineLevelSummary(id, 20),
    getNetworkTotals(id),
  ]);
  if (!userSnap.exists) return null;
  const user = userSnap.data() as AppUserDoc;
  const sponsor = sponsorSnap?.exists ? (sponsorSnap.data() as MemberProfileDoc) : null;
  const placementParent = placementParentSnap?.exists ? (placementParentSnap.data() as MemberProfileDoc) : null;
  const kyc = kycSnap.exists ? (kycSnap.data() as import("@/server/models").KycProfileDoc) : null;
  const wallet = walletSnap.exists ? (walletSnap.data() as import("@/server/models").WalletDoc) : null;

  return {
    member: {
      id,
      memberCode: member.memberCode,
      status: member.status,
      joinedAt: member.joinedAt.toDate().toISOString(),
      placementStrategy: member.placementStrategy,
      sponsorCode: sponsor?.memberCode ?? null,
      sponsorId: member.sponsorId,
      placementParentId: member.placementParentId ?? null,
      placementParentCode: placementParent?.memberCode ?? null,
      leg: member.leg ?? null,
      frozenAt: member.frozenAt?.toDate().toISOString() ?? null,
      frozenReason: member.frozenReason,
      terminatedAt: member.terminatedAt?.toDate().toISOString() ?? null,
      lastMovedAt: member.lastMovedAt?.toDate().toISOString() ?? null,
    },
    user: {
      id: member.userId,
      email: user.email,
      name: user.displayName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      kycStatus: kyc?.status ?? "NOT_SUBMITTED",
      walletBalance: wallet?.balanceCache ?? "0",
      withdrawable: wallet?.settledBalance ?? "0",
    },
    upline: upline.map((u) => ({
      memberCode: u.memberCode,
      name: u.displayName,
      level: u.level,
      status: u.status,
      kycApproved: u.kycApproved,
    })),
    levels: levels.map((l) => ({ level: l.level, members: l.memberCount, active: l.activeCount })),
    totals,
  };
}
