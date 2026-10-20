import "server-only";

// DATABASE COMMENTED OUT — USING MOCK DATA
/*
import { Collections, db } from "@/server/firestore";
import type { AppUserDoc, MemberApplicationDoc, MemberProfileDoc, NetworkClosureDoc } from "@/server/models";
*/

export interface ReferrerRow {
  id: string;
  memberCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  directCount: number;
  teamCount: number;
  pendingLeads: number;
  approvedViaFunnel: number;
  totalLeads: number;
  lastActivityAt: string | null;
  referralLink: string;
}

export interface ReferrerStats {
  activeReferrers: number;
  pendingLeads: number;
  leadsThisMonth: number;
  approvalRate: number | null;
}

const MOCK_REFERRERS: ReferrerRow[] = [
  {
    id: "mem-1",
    memberCode: "AMA-7KQ4MT",
    name: "Sunita Devi",
    email: "sunita.devi@example.com",
    phone: "+91 98765 43210",
    status: "ACTIVE",
    directCount: 6,
    teamCount: 34,
    pendingLeads: 1,
    approvedViaFunnel: 4,
    totalLeads: 5,
    lastActivityAt: new Date(Date.now() - 4 * 3600e3).toISOString(),
    referralLink: "https://amaashop.in/join?ref=AMA-7KQ4MT",
  },
  {
    id: "mem-2",
    memberCode: "AMA-101LFT",
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    phone: "+91 98765 43211",
    status: "ACTIVE",
    directCount: 4,
    teamCount: 18,
    pendingLeads: 1,
    approvedViaFunnel: 3,
    totalLeads: 4,
    lastActivityAt: new Date(Date.now() - 12 * 3600e3).toISOString(),
    referralLink: "https://amaashop.in/join?ref=AMA-101LFT",
  },
  {
    id: "mem-3",
    memberCode: "AMA-102RGT",
    name: "Rajesh Kumar",
    email: "rajesh.kumar@example.com",
    phone: "+91 98765 43212",
    status: "ACTIVE",
    directCount: 5,
    teamCount: 16,
    pendingLeads: 0,
    approvedViaFunnel: 4,
    totalLeads: 5,
    lastActivityAt: new Date(Date.now() - 24 * 3600e3).toISOString(),
    referralLink: "https://amaashop.in/join?ref=AMA-102RGT",
  },
  {
    id: "mem-4",
    memberCode: "AMA-201LLF",
    name: "Amit Patel",
    email: "amit.patel@example.com",
    phone: "+91 98765 43213",
    status: "ACTIVE",
    directCount: 2,
    teamCount: 8,
    pendingLeads: 0,
    approvedViaFunnel: 2,
    totalLeads: 2,
    lastActivityAt: new Date(Date.now() - 48 * 3600e3).toISOString(),
    referralLink: "https://amaashop.in/join?ref=AMA-201LLF",
  },
];

export async function listReferrers(opts: {
  q?: string;
  onlyPending?: boolean;
  sort?: "direct" | "recent";
  skip?: number;
  take?: number;
}): Promise<{ list: ReferrerRow[]; total: number; take: number }> {
  let filtered = [...MOCK_REFERRERS];
  if (opts.onlyPending) {
    filtered = filtered.filter((r) => r.pendingLeads > 0);
  }
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(
      (r) =>
        r.memberCode.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.includes(q),
    );
  }

  const total = filtered.length;
  const skip = Math.max(0, opts.skip ?? 0);
  const take = Math.min(100, Math.max(1, opts.take ?? 25));
  const list = filtered.slice(skip, skip + take);

  return { list, total, take };
}

export async function referrerStats(): Promise<ReferrerStats> {
  return {
    activeReferrers: 14,
    pendingLeads: 2,
    leadsThisMonth: 8,
    approvalRate: 88,
  };
}
