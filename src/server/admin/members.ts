import "server-only";

// DATABASE COMMENTED OUT — USING MOCK DATA
/*
import { Collections, db } from "@/server/firestore";
import type { AppUserDoc, KycProfileDoc, MemberProfileDoc } from "@/server/models";
import { getDownlineLevelSummary, getNetworkTotals, getUplineChain } from "@/server/network/genealogy";
import { getLegCounts } from "@/server/network/binary-tree";
import { findMemberByCodeOrPhone } from "@/server/network/lookup";
*/

export interface MemberListRow {
  id: string;
  memberCode: string;
  name: string;
  email: string | null;
  status: string;
  kycStatus: string;
  sponsorCode: string | null;
  directCount: number;
  placedUnderCode: string | null;
  leg: "LEFT" | "RIGHT" | null;
  binary: boolean;
  leftCount: number;
  rightCount: number;
  joinedAt: string;
}

const MOCK_MEMBER_ROWS: MemberListRow[] = [
  {
    id: "mem-1",
    memberCode: "AMA-7KQ4MT",
    name: "Sunita Devi",
    email: "sunita.devi@example.com",
    status: "ACTIVE",
    kycStatus: "APPROVED",
    sponsorCode: "AMA-ROOT01",
    directCount: 6,
    placedUnderCode: "AMA-ROOT01",
    leg: "LEFT",
    binary: true,
    leftCount: 18,
    rightCount: 16,
    joinedAt: new Date(Date.now() - 90 * 86400e3).toISOString(),
  },
  {
    id: "mem-2",
    memberCode: "AMA-101LFT",
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    status: "ACTIVE",
    kycStatus: "APPROVED",
    sponsorCode: "AMA-7KQ4MT",
    directCount: 4,
    placedUnderCode: "AMA-7KQ4MT",
    leg: "LEFT",
    binary: true,
    leftCount: 10,
    rightCount: 8,
    joinedAt: new Date(Date.now() - 60 * 86400e3).toISOString(),
  },
  {
    id: "mem-3",
    memberCode: "AMA-102RGT",
    name: "Ravi Kumar",
    email: "ravi.kumar@example.com",
    status: "ACTIVE",
    kycStatus: "SUBMITTED",
    sponsorCode: "AMA-7KQ4MT",
    directCount: 3,
    placedUnderCode: "AMA-7KQ4MT",
    leg: "RIGHT",
    binary: true,
    leftCount: 8,
    rightCount: 8,
    joinedAt: new Date(Date.now() - 45 * 86400e3).toISOString(),
  },
  {
    id: "mem-4",
    memberCode: "AMA-201LFT",
    name: "Anjali Mishra",
    email: "anjali.m@example.com",
    status: "ACTIVE",
    kycStatus: "APPROVED",
    sponsorCode: "AMA-101LFT",
    directCount: 2,
    placedUnderCode: "AMA-101LFT",
    leg: "LEFT",
    binary: true,
    leftCount: 4,
    rightCount: 6,
    joinedAt: new Date(Date.now() - 30 * 86400e3).toISOString(),
  },
  {
    id: "mem-5",
    memberCode: "AMA-202RGT",
    name: "Deepak Verma",
    email: "deepak.v@example.com",
    status: "ACTIVE",
    kycStatus: "NOT_SUBMITTED",
    sponsorCode: "AMA-101LFT",
    directCount: 1,
    placedUnderCode: "AMA-101LFT",
    leg: "RIGHT",
    binary: true,
    leftCount: 3,
    rightCount: 5,
    joinedAt: new Date(Date.now() - 20 * 86400e3).toISOString(),
  },
];

export async function listMembers(opts: { q?: string; skip?: number; take?: number } = {}) {
  const take = Math.min(opts.take ?? 30, 100);
  const skip = opts.skip ?? 0;
  const q = opts.q?.trim().toLowerCase();

  let filtered = MOCK_MEMBER_ROWS;
  if (q) {
    filtered = filtered.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.memberCode.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q),
    );
  }

  const total = filtered.length;
  const list = filtered.slice(skip, skip + take);
  return { list, total, take };
}

export async function findMemberIdForAdmin(input: string): Promise<string | null> {
  const q = input.trim().toLowerCase();
  const found = MOCK_MEMBER_ROWS.find(
    (m) => m.memberCode.toLowerCase() === q || m.name.toLowerCase().includes(q),
  );
  return found?.id ?? MOCK_MEMBER_ROWS[0]!.id;
}

export async function getMemberDetail(id: string) {
  const m = MOCK_MEMBER_ROWS.find((x) => x.id === id) ?? MOCK_MEMBER_ROWS[0]!;

  return {
    member: {
      id: m.id,
      memberCode: m.memberCode,
      status: m.status,
      joinedAt: m.joinedAt,
      placementStrategy: "BINARY",
      sponsorCode: m.sponsorCode,
      sponsorId: "mem-root",
      placementParentId: "mem-root",
      placementParentCode: m.placedUnderCode,
      leg: m.leg,
      frozenAt: null,
      frozenReason: null,
      terminatedAt: null,
      lastMovedAt: null,
    },
    user: {
      id: `usr-${m.id}`,
      email: m.email,
      name: m.name,
      phone: "+91 98765 43210",
      role: "MEMBER",
      status: "ACTIVE",
      kycStatus: m.kycStatus,
      walletBalance: "12450.00",
      withdrawable: "10200.00",
    },
    upline: [
      { memberCode: "AMA-ROOT01", name: "Network Founder", level: 1, status: "ACTIVE", kycApproved: true },
    ],
    levels: [
      { level: 1, members: 2, active: 2 },
      { level: 2, members: 4, active: 4 },
      { level: 3, members: 8, active: 6 },
    ],
    totals: {
      totalDownline: m.leftCount + m.rightCount,
      directReferrals: m.directCount,
      frontline: 2,
      deepestLevel: 4,
      joinedThisMonth: 5,
    },
  };
}
