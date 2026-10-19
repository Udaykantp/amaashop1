/**
 * Placeholder view-model data so the member portal renders under `npm run dev`
 * before Cloud SQL / Firebase are connected. Never used in production — the
 * real loaders in overview.ts only fall back here on a backend error, and the
 * pages show a "preview mode" banner alongside.
 */

export type KycStatusVM =
  | "NOT_SUBMITTED"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export interface DashboardActivityItem {
  id: string;
  type: string;
  level: number;
  amount: string;
  status: string;
  when: string;
  fromName: string;
}

export interface MemberDashboardVM {
  name: string;
  memberCode: string;
  status: string;
  kycStatus: KycStatusVM;
  walletBalance: string;
  withdrawableBalance: string;
  teamThisMonth: number;
  totalTeam: number;
  directReferrals: number;
  activity: DashboardActivityItem[];
  preview: boolean;
}

export interface NetworkLevelRow {
  level: number;
  members: number;
  active: number;
  earned: string;
}

export interface NetworkSummaryVM {
  totals: {
    totalTeam: number;
    directReferrals: number;
    deepestLevel: number;
    joinedThisMonth: number;
  };
  levels: NetworkLevelRow[];
  preview: boolean;
}

export const PREVIEW_DASHBOARD: MemberDashboardVM = {
  name: "Preview Member",
  memberCode: "AMA-7KQ4MT",
  status: "ACTIVE",
  kycStatus: "SUBMITTED",
  walletBalance: "1245.00",
  withdrawableBalance: "820.00",
  teamThisMonth: 6,
  totalTeam: 34,
  directReferrals: 4,
  activity: [
    { id: "p1", type: "JOINING_LEVEL_INCOME", level: 0, amount: "400.00", status: "POSTED", when: new Date(Date.now() - 3 * 3600e3).toISOString(), fromName: "Priya S." },
    { id: "p2", type: "JOINING_LEVEL_INCOME", level: 2, amount: "25.00", status: "POSTED", when: new Date(Date.now() - 26 * 3600e3).toISOString(), fromName: "Ravi K." },
    { id: "p3", type: "JOINING_LEVEL_INCOME", level: 1, amount: "25.00", status: "POSTED", when: new Date(Date.now() - 50 * 3600e3).toISOString(), fromName: "Anjali M." },
    { id: "p4", type: "JOINING_LEVEL_INCOME", level: 5, amount: "20.00", status: "HELD", when: new Date(Date.now() - 72 * 3600e3).toISOString(), fromName: "Sunil P." },
  ],
  preview: true,
};

export const PREVIEW_NETWORK: NetworkSummaryVM = {
  totals: { totalTeam: 34, directReferrals: 4, deepestLevel: 5, joinedThisMonth: 6 },
  levels: [
    { level: 1, members: 4, active: 4, earned: "100.00" },
    { level: 2, members: 9, active: 7, earned: "225.00" },
    { level: 3, members: 12, active: 8, earned: "300.00" },
    { level: 4, members: 6, active: 3, earned: "150.00" },
    { level: 5, members: 3, active: 1, earned: "60.00" },
  ],
  preview: true,
};
