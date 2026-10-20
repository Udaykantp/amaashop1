// DATABASE COMMENTED OUT — USING MOCK DATA
/*
import { Collections, db } from "@/server/firestore";
import type { CommissionRuleSetDoc } from "@/server/models";
*/

export interface AdminMetrics {
  members: { total: number; pendingKyc: number; joinedThisMonth: number };
  pendingApplications: number;
  kycQueue: number;
  commissionJobs: { pending: number; deadLetter: number };
  payoutBatches: { draft: number; processing: number };
  lowStockSkus: number;
  activeRuleSet: { name: string; effectiveFrom: string; confirmPending: number } | null;
}

/** System-health numbers for the admin home — using mock data */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  return {
    members: { total: 42, pendingKyc: 3, joinedThisMonth: 12 },
    pendingApplications: 2,
    kycQueue: 3,
    commissionJobs: { pending: 0, deadLetter: 0 },
    payoutBatches: { draft: 1, processing: 0 },
    lowStockSkus: 2,
    activeRuleSet: {
      name: "Binary Standard Plan v2.1",
      effectiveFrom: new Date(Date.now() - 30 * 86400e3).toISOString(),
      confirmPending: 0,
    },
  };
}
