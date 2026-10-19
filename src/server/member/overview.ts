import "server-only";
import { backendStatus } from "@/server/config";
import { Collections, db, doc } from "@/server/firestore";
import type { AppUserDoc, CommissionLedgerEntryDoc, KycProfileDoc, MemberProfileDoc, WalletDoc } from "@/server/models";
import { log } from "@/server/log";
import { add, moneyFromFirestore, type Money } from "@/server/money";

export { backendStatus };
import { getDownlineLevelSummary, getNetworkTotals, MAX_COMMISSION_DEPTH } from "@/server/network/genealogy";
import { PREVIEW_DASHBOARD, PREVIEW_NETWORK, type MemberDashboardVM, type NetworkSummaryVM } from "@/server/member/preview-data";

export type { MemberDashboardVM, NetworkSummaryVM };

// ─────────────────────────────────────────────────────────────────────────────

export async function getMemberDashboard(memberProfileId: string): Promise<MemberDashboardVM> {
  if (!backendStatus().configured || memberProfileId === "preview") return PREVIEW_DASHBOARD;
  try {
    const firestore = db();
    const profileSnap = await doc(Collections.memberProfiles, memberProfileId).get();
    if (!profileSnap.exists) throw new Error("Member profile not found");
    const profile = profileSnap.data() as MemberProfileDoc;

    const [userSnap, walletSnap, totals, kycSnap, recentSnap] = await Promise.all([
      doc(Collections.appUsers, profile.userId).get(),
      doc(Collections.wallets, profile.userId).get(),
      getNetworkTotals(memberProfileId),
      doc(Collections.kycProfiles, profile.userId).get(),
      firestore
        .collection(Collections.commissionLedgerEntries)
        .where("beneficiaryId", "==", memberProfileId)
        .where("status", "in", ["POSTED", "PENDING", "HELD"])
        .orderBy("createdAt", "desc")
        .limit(6)
        .get(),
    ]);
    const user = userSnap.exists ? (userSnap.data() as AppUserDoc) : null;
    const wallet = walletSnap.exists ? (walletSnap.data() as WalletDoc) : null;
    const kyc = kycSnap.exists ? (kycSnap.data() as KycProfileDoc) : null;

    const recent = recentSnap.docs.map((d) => ({ id: d.id, ...(d.data() as CommissionLedgerEntryDoc) }));
    const sourceMemberIds = [...new Set(recent.map((r) => r.sourceMemberId).filter((x): x is string => !!x))];
    const sourceMemberSnaps = sourceMemberIds.length
      ? await firestore.getAll(...sourceMemberIds.map((id) => firestore.collection(Collections.memberProfiles).doc(id)))
      : [];
    const sourceMembersById = new Map(sourceMemberSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as MemberProfileDoc]));
    const sourceUserIds = [...new Set([...sourceMembersById.values()].map((m) => m.userId))];
    const sourceUserSnaps = sourceUserIds.length
      ? await firestore.getAll(...sourceUserIds.map((id) => firestore.collection(Collections.appUsers).doc(id)))
      : [];
    const sourceUsersByUid = new Map(sourceUserSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));

    return {
      name: user?.displayName ?? "Member",
      memberCode: profile.memberCode,
      status: profile.status,
      kycStatus: kyc?.status ?? "NOT_SUBMITTED",
      walletBalance: wallet?.balanceCache ?? "0",
      withdrawableBalance: wallet?.settledBalance ?? "0",
      teamThisMonth: totals.joinedThisMonth,
      totalTeam: totals.totalDownline,
      directReferrals: totals.directReferrals,
      activity: recent.map((r) => {
        const sourceMember = r.sourceMemberId ? sourceMembersById.get(r.sourceMemberId) : null;
        const sourceUser = sourceMember ? sourceUsersByUid.get(sourceMember.userId) : null;
        return {
          id: r.id,
          type: r.type,
          level: r.level,
          amount: r.amount,
          status: r.status,
          when: r.createdAt.toDate().toISOString(),
          fromName: sourceUser?.displayName ?? sourceMember?.memberCode ?? "a downline order",
        };
      }),
      preview: false,
    };
  } catch (err) {
    log.warn("dashboard fell back to preview data", { err: String(err) });
    return PREVIEW_DASHBOARD;
  }
}

export async function getNetworkSummary(memberProfileId: string): Promise<NetworkSummaryVM> {
  if (!backendStatus().configured || memberProfileId === "preview") return PREVIEW_NETWORK;
  try {
    const [levels, totals, earnedSnap] = await Promise.all([
      getDownlineLevelSummary(memberProfileId, MAX_COMMISSION_DEPTH),
      getNetworkTotals(memberProfileId),
      db().collection(Collections.commissionLedgerEntries).where("beneficiaryId", "==", memberProfileId).where("status", "==", "POSTED").get(),
    ]);

    // earnings per level, from the ledger — Firestore has no `groupBy`, so
    // aggregate in memory (bounded: one member's own ledger).
    const earnedByLevel = new Map<number, string>();
    const sums = new Map<number, Money>();
    for (const d of earnedSnap.docs) {
      const e = d.data() as CommissionLedgerEntryDoc;
      sums.set(e.level, add(sums.get(e.level) ?? "0", moneyFromFirestore(e.amount)));
    }
    for (const [level, total] of sums) earnedByLevel.set(level, total.toFixed(2));

    return {
      totals: {
        totalTeam: totals.totalDownline,
        directReferrals: totals.directReferrals,
        deepestLevel: totals.deepestLevel,
        joinedThisMonth: totals.joinedThisMonth,
      },
      levels: levels.map((l) => ({
        level: l.level,
        members: l.memberCount,
        active: l.activeCount,
        earned: earnedByLevel.get(l.level) ?? "0",
      })),
      preview: false,
    };
  } catch (err) {
    log.warn("network summary fell back to preview data", { err: String(err) });
    return PREVIEW_NETWORK;
  }
}
