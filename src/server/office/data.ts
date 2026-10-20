import "server-only";

// DATABASE COMMENTED OUT — USING MOCK DATA
/*
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
*/

export interface WalletTxnVM {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  note: string | null;
  when: string;
}

export async function getWalletView(userId: string) {
  return {
    balance: "12450.00",
    settled: "10200.00",
    onHoldForWithdrawal: "2250.00",
    transactions: [
      {
        id: "tx-1",
        type: "CREDIT_COMMISSION",
        amount: "1500.00",
        balanceAfter: "12450.00",
        note: "Joining bonus from Priya S. (Level 1)",
        when: new Date(Date.now() - 2 * 3600e3).toISOString(),
      },
      {
        id: "tx-2",
        type: "CREDIT_COMMISSION",
        amount: "850.00",
        balanceAfter: "10950.00",
        note: "Repurchase commission from team volume",
        when: new Date(Date.now() - 24 * 3600e3).toISOString(),
      },
      {
        id: "tx-3",
        type: "DEBIT_WITHDRAWAL",
        amount: "-5000.00",
        balanceAfter: "10100.00",
        note: "Bank transfer to HDFC Bank ••••4021",
        when: new Date(Date.now() - 72 * 3600e3).toISOString(),
      },
      {
        id: "tx-4",
        type: "CREDIT_COMMISSION",
        amount: "2100.00",
        balanceAfter: "15100.00",
        note: "Leadership rank pool bonus (Silver)",
        when: new Date(Date.now() - 120 * 3600e3).toISOString(),
      },
    ],
  };
}

export interface IncomeTypeRow {
  type: string;
  total: string;
  count: number;
}

export async function getIncomeView(memberProfileId: string) {
  return {
    lifetime: "48650.00",
    thisMonth: "14200.00",
    pending: "2250.00",
    byType: [
      { type: "JOINING_SPONSOR_BONUS", total: "24000.00", count: 16 },
      { type: "REPURCHASE_LEVEL_INCOME", total: "18250.00", count: 42 },
      { type: "LEADERSHIP_POOL_BONUS", total: "6400.00", count: 3 },
    ],
    recent: [
      {
        id: "inc-1",
        type: "JOINING_SPONSOR_BONUS",
        level: 1,
        amount: "1500.00",
        status: "POSTED",
        when: new Date(Date.now() - 2 * 3600e3).toISOString(),
        from: "Priya Sharma (AMA-7KQ4MT)",
      },
      {
        id: "inc-2",
        type: "REPURCHASE_LEVEL_INCOME",
        level: 2,
        amount: "450.00",
        status: "POSTED",
        when: new Date(Date.now() - 12 * 3600e3).toISOString(),
        from: "Amit Verma (AMA-9KL2PX)",
      },
      {
        id: "inc-3",
        type: "REPURCHASE_LEVEL_INCOME",
        level: 1,
        amount: "320.00",
        status: "POSTED",
        when: new Date(Date.now() - 36 * 3600e3).toISOString(),
        from: "Deepak Joshi (AMA-4NJ9YR)",
      },
    ],
  };
}

export async function getWithdrawalsView(userId: string) {
  return {
    list: [
      {
        id: "wd-101",
        amount: "5000.00",
        status: "PAID",
        bankLast4: "4021",
        ifsc: "HDFC0001234",
        requestedAt: new Date(Date.now() - 72 * 3600e3).toISOString(),
        reviewedAt: new Date(Date.now() - 48 * 3600e3).toISOString(),
        note: "NEFT Reference #N1029384756",
      },
      {
        id: "wd-102",
        amount: "2250.00",
        status: "PENDING",
        bankLast4: "4021",
        ifsc: "HDFC0001234",
        requestedAt: new Date(Date.now() - 10 * 3600e3).toISOString(),
        reviewedAt: null,
        note: "Under compliance review",
      },
    ],
    totalPaid: "5000.00",
    totalPending: "2250.00",
  };
}

export async function getKycView(userId: string) {
  return {
    status: "APPROVED",
    panLast4: "8821",
    aadhaarLast4: "4920",
    bankLast4: "4021",
    ifsc: "HDFC0001234",
    accountHolder: "Rahul Sharma",
    panVerified: true,
    hasBank: true,
    documents: {
      aadhaar: true,
      pan: true,
      bank: true,
      photo: true,
    },
    submittedAt: new Date(Date.now() - 30 * 86400e3).toISOString(),
    reviewedAt: new Date(Date.now() - 28 * 86400e3).toISOString(),
    rejectionReason: null,
  };
}

const RANK_LADDER = [
  { name: "Distributor", directs: 0, team: 0 },
  { name: "Silver", directs: 2, team: 10 },
  { name: "Gold", directs: 5, team: 50 },
  { name: "Platinum", directs: 10, team: 200 },
  { name: "Diamond", directs: 20, team: 1000 },
];

export async function getRankProgress(memberProfileId: string) {
  const directs = 4;
  const totalDownline = 34;
  const currentIdx = 1; // Silver
  const current = RANK_LADDER[currentIdx]!;
  const next = RANK_LADDER[currentIdx + 1] ?? null;

  return {
    current: current.name,
    next: next?.name ?? null,
    directs,
    team: totalDownline,
    nextNeeds: next
      ? {
          directs: Math.max(0, next.directs - directs),
          team: Math.max(0, next.team - totalDownline),
        }
      : null,
    ladder: RANK_LADDER.map((r, i) => ({ ...r, reached: i <= currentIdx })),
  };
}
