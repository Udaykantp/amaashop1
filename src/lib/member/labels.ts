/** Plain-language phrasing for member-facing enums (brief §5.1). Client-safe. */

import type { KycStatusVM } from "@/server/member/preview-data";

export function commissionTypeLabel(type: string): string {
  switch (type) {
    case "JOINING_LEVEL_INCOME":
      return "Joining bonus";
    case "REPURCHASE_COMMISSION":
      return "Repurchase commission";
    case "TRUST_CONTRIBUTION":
      return "Trust contribution";
    case "CLAWBACK":
      return "Adjustment (order refunded)";
    case "ADJUSTMENT":
      return "Manual adjustment";
    default:
      return type;
  }
}

/** "You earned ₹25 — Level 2 joining bonus from Priya S." */
export function activitySentence(a: {
  type: string;
  level: number;
  fromName: string;
}): string {
  const kind = commissionTypeLabel(a.type).toLowerCase();
  const where =
    a.type === "JOINING_LEVEL_INCOME"
      ? `Level ${a.level} ${kind} from ${a.fromName}`
      : a.type === "REPURCHASE_COMMISSION"
        ? `Level ${a.level} ${kind} from ${a.fromName}`
        : kind;
  return `You earned — ${where}`;
}

export function ledgerStatusNote(status: string): { label: string; tone: "credit" | "muted" | "debit" } {
  switch (status) {
    case "POSTED":
      return { label: "Credited", tone: "credit" };
    case "PENDING":
      return { label: "Processing", tone: "muted" };
    case "HELD":
      return { label: "Held — complete your KYC to release", tone: "muted" };
    case "REVERSED":
      return { label: "Reversed", tone: "debit" };
    default:
      return { label: status, tone: "muted" };
  }
}

export function kycNextStep(status: KycStatusVM): { label: string; cta: string | null; done: boolean } {
  switch (status) {
    case "APPROVED":
      return { label: "Verified", cta: null, done: true };
    case "UNDER_REVIEW":
    case "SUBMITTED":
      return { label: "Under review — we'll notify you", cta: null, done: false };
    case "REJECTED":
      return { label: "Needs changes", cta: "Fix your KYC", done: false };
    default:
      return { label: "Not started", cta: "Add bank details to withdraw", done: false };
  }
}
