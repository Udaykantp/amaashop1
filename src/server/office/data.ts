import "server-only";
import { Collections, db, doc } from "@/server/firestore";
import type {
  AppUserDoc,
  CommissionLedgerEntryDoc,
  KycProfileDoc,
  MemberProfileDoc,
  WalletDoc,
  WalletTransactionDoc,
  WithdrawalRequestDoc,
} from "@/server/models";
import { moneyFromFirestore, ZERO, add, type Money } from "@/server/money";
import { getNetworkTotals } from "@/server/network/genealogy";

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const sumAmounts = (docs: { amount: string }[]) => add(...docs.map((d) => moneyFromFirestore(d.amount)));

// ── E-Wallet ──────────────────────────────────────────────────────────────

export interface WalletTxnVM {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  note: string | null;
  when: string;
}

export async function getWalletView(userId: string) {
  // Wallet docs are keyed by userId (1:1), so walletId === userId.
  const [walletSnap, txnsSnap, pendingSnap] = await Promise.all([
    doc(Collections.wallets, userId).get(),
    db().collection(Collections.walletTransactions).where("walletId", "==", userId).orderBy("createdAt", "desc").limit(50).get(),
    db()
      .collection(Collections.withdrawalRequests)
      .where("userId", "==", userId)
      .where("status", "in", ["PENDING", "APPROVED", "ON_HOLD"])
      .get(),
  ]);
  const wallet = walletSnap.exists ? (walletSnap.data() as WalletDoc) : null;
  const pending = pendingSnap.docs.map((d) => d.data() as WithdrawalRequestDoc);

  return {
    balance: moneyFromFirestore(wallet?.balanceCache).toFixed(2),
    settled: moneyFromFirestore(wallet?.settledBalance).toFixed(2),
    onHoldForWithdrawal: sumAmounts(pending).toFixed(2),
    transactions: txnsSnap.docs.map<WalletTxnVM>((d) => {
      const t = { id: d.id, ...(d.data() as WalletTransactionDoc) };
      return {
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        note: t.note,
        when: t.createdAt.toDate().toISOString(),
      };
    }),
  };
}

// ── Income / commissions ─────────────────────────────────────────────────

export interface IncomeTypeRow {
  type: string;
  total: string;
  count: number;
}

export async function getIncomeView(memberProfileId: string) {
  const som = startOfMonth();
  const firestore = db();

  const [postedSnap, pendingSnap, recentSnap] = await Promise.all([
    firestore.collection(Collections.commissionLedgerEntries).where("beneficiaryId", "==", memberProfileId).where("status", "==", "POSTED").get(),
    firestore
      .collection(Collections.commissionLedgerEntries)
      .where("beneficiaryId", "==", memberProfileId)
      .where("status", "in", ["PENDING", "HELD"])
      .get(),
    firestore.collection(Collections.commissionLedgerEntries).where("beneficiaryId", "==", memberProfileId).orderBy("createdAt", "desc").limit(30).get(),
  ]);

  const posted = postedSnap.docs.map((d) => ({ id: d.id, ...(d.data() as CommissionLedgerEntryDoc) }));
  const thisMonthPosted = posted.filter((e) => e.postedAt && e.postedAt.toDate() >= som);
  const byTypeMap = new Map<string, { total: Money; count: number }>();
  for (const e of posted) {
    const cur = byTypeMap.get(e.type) ?? { total: ZERO, count: 0 };
    cur.total = add(cur.total, moneyFromFirestore(e.amount));
    cur.count += 1;
    byTypeMap.set(e.type, cur);
  }

  const recentIds = recentSnap.docs.map((d) => ({ id: d.id, data: d.data() as CommissionLedgerEntryDoc }));
  const sourceMemberIds = [...new Set(recentIds.map((r) => r.data.sourceMemberId).filter((x): x is string => !!x))];
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
    lifetime: sumAmounts(posted).toFixed(2),
    thisMonth: sumAmounts(thisMonthPosted).toFixed(2),
    pending: sumAmounts(pendingSnap.docs.map((d) => d.data() as CommissionLedgerEntryDoc)).toFixed(2),
    byType: [...byTypeMap.entries()]
      .map<IncomeTypeRow>(([type, v]) => ({ type, total: v.total.toFixed(2), count: v.count }))
      .sort((a, b) => Number(b.total) - Number(a.total)),
    recent: recentIds.map((r) => {
      const sourceMember = r.data.sourceMemberId ? sourceMembersById.get(r.data.sourceMemberId) : null;
      const sourceUser = sourceMember ? sourceUsersByUid.get(sourceMember.userId) : null;
      return {
        id: r.id,
        type: r.data.type,
        level: r.data.level,
        amount: r.data.amount,
        status: r.data.status,
        when: r.data.createdAt.toDate().toISOString(),
        from: sourceUser?.displayName ?? sourceMember?.memberCode ?? "a downline order",
      };
    }),
  };
}

// ── Withdrawals ──────────────────────────────────────────────────────────

export async function getWithdrawalsView(userId: string) {
  const firestore = db();
  const [listSnap, paidSnap, pendingSnap] = await Promise.all([
    firestore.collection(Collections.withdrawalRequests).where("userId", "==", userId).orderBy("requestedAt", "desc").limit(50).get(),
    firestore.collection(Collections.withdrawalRequests).where("userId", "==", userId).where("status", "==", "PAID").get(),
    firestore
      .collection(Collections.withdrawalRequests)
      .where("userId", "==", userId)
      .where("status", "in", ["PENDING", "APPROVED", "ON_HOLD"])
      .get(),
  ]);

  return {
    list: listSnap.docs.map((d) => {
      const w = { id: d.id, ...(d.data() as WithdrawalRequestDoc) };
      return {
        id: w.id,
        amount: w.amount,
        status: w.status,
        bankLast4: w.bankAccountLast4,
        ifsc: w.ifsc,
        requestedAt: w.requestedAt.toDate().toISOString(),
        reviewedAt: w.reviewedAt?.toDate().toISOString() ?? null,
        note: w.reviewNote,
      };
    }),
    totalPaid: sumAmounts(paidSnap.docs.map((d) => d.data() as WithdrawalRequestDoc)).toFixed(2),
    totalPending: sumAmounts(pendingSnap.docs.map((d) => d.data() as WithdrawalRequestDoc)).toFixed(2),
  };
}

// ── KYC & bank ───────────────────────────────────────────────────────────

export async function getKycView(userId: string) {
  const snap = await doc(Collections.kycProfiles, userId).get();
  const k = snap.exists ? (snap.data() as KycProfileDoc) : null;

  const docs = k?.documentPaths ?? {};
  return {
    status: k?.status ?? "NOT_SUBMITTED",
    panLast4: k?.panLast4 ?? null,
    aadhaarLast4: k?.aadhaarLast4 ?? null,
    bankLast4: k?.bankAccountLast4 ?? null,
    ifsc: k?.ifsc ?? null,
    accountHolder: k?.accountHolderName ?? null,
    panVerified: k?.status === "APPROVED" && Boolean(k?.panLast4),
    hasBank: Boolean(k?.bankAccountLast4),
    documents: {
      aadhaar: Boolean(docs.aadhaarFront || docs.aadhaar),
      pan: Boolean(docs.panCard || docs.pan),
      bank: Boolean(docs.bankProof || docs.cheque),
      photo: Boolean(docs.photo || docs.selfie),
    },
    submittedAt: k?.submittedAt?.toDate().toISOString() ?? null,
    reviewedAt: k?.reviewedAt?.toDate().toISOString() ?? null,
    rejectionReason: k?.rejectionReason ?? null,
  };
}

// ── Rank progress (derived — the plan's rank ladder is [CONFIRM]) ─────────

const RANK_LADDER = [
  { name: "Distributor", directs: 0, team: 0 },
  { name: "Silver", directs: 2, team: 10 },
  { name: "Gold", directs: 5, team: 50 },
  { name: "Platinum", directs: 10, team: 200 },
  { name: "Diamond", directs: 20, team: 1000 },
];

export async function getRankProgress(memberProfileId: string) {
  const totals = await getNetworkTotals(memberProfileId);
  let currentIdx = 0;
  for (let i = RANK_LADDER.length - 1; i >= 0; i--) {
    const r = RANK_LADDER[i]!;
    if (totals.directReferrals >= r.directs && totals.totalDownline >= r.team) {
      currentIdx = i;
      break;
    }
  }
  const current = RANK_LADDER[currentIdx]!;
  const next = RANK_LADDER[currentIdx + 1] ?? null;
  return {
    current: current.name,
    next: next?.name ?? null,
    directs: totals.directReferrals,
    team: totals.totalDownline,
    nextNeeds: next
      ? { directs: Math.max(0, next.directs - totals.directReferrals), team: Math.max(0, next.team - totals.totalDownline) }
      : null,
    ladder: RANK_LADDER.map((r, i) => ({ ...r, reached: i <= currentIdx })),
  };
}
