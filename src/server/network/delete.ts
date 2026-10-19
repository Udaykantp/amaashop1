import "server-only";
import { Filter } from "firebase-admin/firestore";
import { adminAuth } from "@/server/auth/admin";
import { Collections, db, doc } from "@/server/firestore";
import type { AppUserDoc, MemberApplicationDoc, MemberProfileDoc } from "@/server/models";
import { log } from "@/server/log";
import { NetworkError } from "@/server/network/genealogy";

/**
 * Hard-deleting a distributor is only safe when nothing in the ledger, the
 * store, or the genealogy points at them — i.e. it was a mistaken / duplicate
 * enrollment that never went anywhere. Anyone with downline or financial
 * history must go through **Terminate** (which keeps the row for audit and
 * compresses the tree) instead.
 */

export interface DeleteBlockers {
  downline: number;
  commissionEntries: number;
  trustEntries: number;
  memberOrders: number;
  joiningOrder: boolean;
  walletTxns: number;
  withdrawals: number;
}

export interface DistributorDeletability {
  memberCode: string;
  /** Safe to remove the MemberProfile. */
  deletable: boolean;
  blockers: DeleteBlockers;
  /** Extra checks that only matter if the admin also wants the login gone. */
  loginBlockers: { customerOrders: number; adminActions: number };
  /** Safe to also delete the AppUser + Firebase account. */
  loginRemovable: boolean;
}

export async function getDistributorDeletability(memberId: string): Promise<DistributorDeletability | null> {
  const memberSnap = await doc(Collections.memberProfiles, memberId).get();
  if (!memberSnap.exists) return null;
  const member = memberSnap.data() as MemberProfileDoc;
  const firestore = db();

  const count = (q: FirebaseFirestore.Query) => q.count().get().then((s) => s.data().count);

  const [
    downline,
    directReferrals,
    commissionEntries,
    trustEntries,
    memberOrders,
    walletTxns,
    withdrawals,
    customerOrders,
    adminActions,
  ] = await Promise.all([
    count(
      firestore.collection(Collections.networkClosure).where("ancestorId", "==", memberId).where("depth", ">=", 1),
    ),
    count(firestore.collection(Collections.memberProfiles).where("sponsorId", "==", memberId)),
    count(
      firestore
        .collection(Collections.commissionLedgerEntries)
        .where(Filter.or(Filter.where("beneficiaryId", "==", memberId), Filter.where("sourceMemberId", "==", memberId))),
    ),
    count(firestore.collection(Collections.trustFundLedgerEntries).where("sourceMemberId", "==", memberId)),
    count(firestore.collection(Collections.orders).where("placedByMemberId", "==", memberId)),
    // Wallet docs are keyed by userId, so walletId === userId — no join needed.
    count(firestore.collection(Collections.walletTransactions).where("walletId", "==", member.userId)),
    count(firestore.collection(Collections.withdrawalRequests).where("userId", "==", member.userId)),
    count(firestore.collection(Collections.orders).where("userId", "==", member.userId)),
    count(firestore.collection(Collections.auditLogs).where("actorUserId", "==", member.userId)),
  ]);

  const blockers: DeleteBlockers = {
    downline: Math.max(downline, directReferrals),
    commissionEntries,
    trustEntries,
    memberOrders,
    joiningOrder: Boolean(member.joiningOrderId),
    walletTxns,
    withdrawals,
  };

  const deletable =
    blockers.downline === 0 &&
    commissionEntries === 0 &&
    trustEntries === 0 &&
    memberOrders === 0 &&
    !member.joiningOrderId &&
    walletTxns === 0 &&
    withdrawals === 0;

  const loginBlockers = { customerOrders, adminActions };
  const loginRemovable = deletable && customerOrders === 0 && adminActions === 0;

  return { memberCode: member.memberCode, deletable, blockers, loginBlockers, loginRemovable };
}

export interface DeleteDistributorResult {
  memberCode: string;
  loginDeleted: boolean;
  /** What happened to a `/join` application that had provisioned this member. */
  applicationHandled: "reverted-to-pending" | "deleted" | "none";
}

export async function deleteDistributor(opts: { memberId: string; actorUserId: string }): Promise<DeleteDistributorResult> {
  const { memberId } = opts;
  const firestore = db();

  const memberSnap = await doc(Collections.memberProfiles, memberId).get();
  if (!memberSnap.exists) throw new NetworkError("Distributor not found.", "NOT_FOUND");
  const member = memberSnap.data() as MemberProfileDoc;

  const check = await getDistributorDeletability(memberId);
  if (!check || !check.deletable) {
    throw new NetworkError(
      "This distributor has downline or earnings history and can't be deleted. Use Terminate instead.",
      "DELETE_BLOCKED",
    );
  }

  // Take the login with it when the account has no separate customer activity;
  // otherwise just strip the membership and leave a plain customer account.
  const alsoDeleteLogin = check.loginRemovable;
  let applicationHandled: DeleteDistributorResult["applicationHandled"] = "none";

  await firestore.runTransaction(async (tx) => {
    // ── reads ──
    const appSnap = await tx.get(
      firestore.collection(Collections.memberApplications).where("memberProfileId", "==", memberId).limit(1),
    );
    // Every closure edge INTO this member (their self-edge plus one per ancestor)
    // must go too — with the leg counts now derived from the closure table, a
    // stale ancestor->member edge would keep inflating their upline's team size.
    const closureEdgesSnap = await tx.get(
      firestore.collection(Collections.networkClosure).where("descendantId", "==", memberId),
    );
    const familyMembersSnap = await tx.get(
      doc(Collections.memberProfiles, memberId).collection("family_members"),
    );
    const notificationsSnap = alsoDeleteLogin
      ? await tx.get(firestore.collection(Collections.notifications).where("userId", "==", member.userId))
      : null;

    // ── writes ──
    if (!appSnap.empty) {
      const appDoc = appSnap.docs[0]!;
      const app = appDoc.data() as MemberApplicationDoc;
      if (app.source === "ADMIN") {
        tx.delete(appDoc.ref);
        applicationHandled = "deleted";
      } else {
        tx.update(appDoc.ref, {
          status: "PENDING",
          memberProfileId: null,
          reviewedByUserId: null,
          reviewedAt: null,
          reviewNote:
            "Provisioned distributor deleted by an admin; application returned to the pending queue.",
        } satisfies Partial<MemberApplicationDoc>);
        applicationHandled = "reverted-to-pending";
      }
    }

    // No cascade in Firestore — explicitly clean up what Postgres's
    // `onDelete: Cascade` used to: the closure edges, FamilyMember rows, and (if
    // the login goes too) Wallet, KycProfile, Notification rows.
    for (const d of closureEdgesSnap.docs) tx.delete(d.ref);
    for (const d of familyMembersSnap.docs) tx.delete(d.ref);
    tx.delete(doc(Collections.memberProfiles, memberId));

    if (alsoDeleteLogin) {
      tx.delete(doc(Collections.wallets, member.userId));
      tx.delete(doc(Collections.kycProfiles, member.userId));
      for (const d of notificationsSnap!.docs) tx.delete(d.ref);
      tx.delete(doc(Collections.appUsers, member.userId));
    } else {
      tx.update(doc(Collections.appUsers, member.userId), { role: "CONSUMER" } satisfies Partial<AppUserDoc>);
    }
  });

  const loginDeleted = alsoDeleteLogin;
  if (loginDeleted) {
    await adminAuth()
      .deleteUser(member.userId)
      .catch((e) =>
        log.error("deleteDistributor: Firebase user cleanup failed (Firestore doc already gone)", {
          uid: member.userId,
          err: String(e),
        }),
      );
  }

  log.warn("distributor deleted", {
    memberId,
    memberCode: member.memberCode,
    loginDeleted,
    applicationHandled,
  });

  return { memberCode: member.memberCode, loginDeleted, applicationHandled };
}
