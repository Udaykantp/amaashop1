import "server-only";
import { Collections, db } from "@/server/firestore";
import type { CommissionRuleSetDoc } from "@/server/models";

export interface AdminMetrics {
  members: { total: number; pendingKyc: number; joinedThisMonth: number };
  pendingApplications: number;
  kycQueue: number;
  commissionJobs: { pending: number; deadLetter: number };
  payoutBatches: { draft: number; processing: number };
  lowStockSkus: number;
  activeRuleSet: { name: string; effectiveFrom: string; confirmPending: number } | null;
}

/** System-health numbers for the admin home — the things that need attention. */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const firestore = db();
  const count = (q: FirebaseFirestore.Query) => q.count().get().then((s) => s.data().count);

  const [
    memberTotal,
    memberPendingKyc,
    memberThisMonth,
    pendingApplications,
    kycQueue,
    jobsPending,
    jobsDead,
    batchDraft,
    batchProcessing,
    lowStock,
    ruleSetSnap,
  ] = await Promise.all([
    count(firestore.collection(Collections.memberProfiles)),
    count(firestore.collection(Collections.memberProfiles).where("status", "==", "PENDING_KYC")),
    count(firestore.collection(Collections.memberProfiles).where("joinedAt", ">=", startOfMonth)),
    count(firestore.collection(Collections.memberApplications).where("status", "in", ["PENDING", "ON_HOLD"])),
    count(firestore.collection(Collections.kycProfiles).where("status", "in", ["SUBMITTED", "UNDER_REVIEW"])),
    count(firestore.collection(Collections.commissionJobs).where("status", "==", "PENDING")),
    count(firestore.collection(Collections.commissionJobs).where("status", "==", "DEAD_LETTER")),
    count(firestore.collection(Collections.payoutBatches).where("status", "==", "DRAFT")),
    count(firestore.collection(Collections.payoutBatches).where("status", "==", "PROCESSING")),
    count(firestore.collection(Collections.inventoryItems).where("qtyAvailable", "<=", 5)),
    firestore.collection(Collections.commissionRuleSets).where("status", "==", "ACTIVE").orderBy("effectiveFrom", "desc").limit(1).get(),
  ]);

  const ruleSet = ruleSetSnap.empty ? null : (ruleSetSnap.docs[0]!.data() as CommissionRuleSetDoc);

  return {
    members: { total: memberTotal, pendingKyc: memberPendingKyc, joinedThisMonth: memberThisMonth },
    pendingApplications,
    kycQueue,
    commissionJobs: { pending: jobsPending, deadLetter: jobsDead },
    payoutBatches: { draft: batchDraft, processing: batchProcessing },
    lowStockSkus: lowStock,
    activeRuleSet: ruleSet
      ? {
          name: ruleSet.name,
          effectiveFrom: ruleSet.effectiveFrom.toDate().toISOString(),
          confirmPending: ruleSet.confirmPending ? Object.keys(ruleSet.confirmPending).length : 0,
        }
      : null,
  };
}
