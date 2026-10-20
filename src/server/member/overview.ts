import "server-only";
import { PREVIEW_DASHBOARD, PREVIEW_NETWORK, type MemberDashboardVM, type NetworkSummaryVM } from "@/server/member/preview-data";

// DATABASE COMMENTED OUT — USING MOCK DATA
/*
import { backendStatus } from "@/server/config";
import { Collections, db, doc } from "@/server/firestore";
import type { AppUserDoc, CommissionLedgerEntryDoc, KycProfileDoc, MemberProfileDoc, WalletDoc } from "@/server/models";
import { log } from "@/server/log";
import { add, moneyFromFirestore, type Money } from "@/server/money";
import { getDownlineLevelSummary, getNetworkTotals, MAX_COMMISSION_DEPTH } from "@/server/network/genealogy";
*/

export { PREVIEW_DASHBOARD, PREVIEW_NETWORK };
export type { MemberDashboardVM, NetworkSummaryVM };

export const backendStatus = () => ({
  configured: false,
  missing: ["DATABASE_MOCKED"],
  services: { firebase: false, gcs: false },
});

export async function getMemberDashboard(memberProfileId: string): Promise<MemberDashboardVM> {
  // Using rich mock preview dashboard with database commented out
  return PREVIEW_DASHBOARD;
}

export async function getNetworkSummary(memberProfileId: string): Promise<NetworkSummaryVM> {
  // Using rich mock network summary with database commented out
  return PREVIEW_NETWORK;
}
