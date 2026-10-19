/**
 * Payout maths for a distributor withdrawal — the same rules the Finance Admin
 * desk applies, exposed to the distributor so the request screen shows exactly
 * what will land in the bank.
 *
 * Pure module (no `server-only`) so the client withdrawal form can render a
 * live breakdown as the amount is typed.
 *
 *  • TDS — Income Tax Act s.194H (commission/brokerage):
 *      5%  when a valid PAN is on file
 *      20% when PAN is missing / unverified
 *  • Processing fee — flat bank-transfer charge, waived above a threshold
 *  • Minimum withdrawal — below this the request is rejected
 */

export const PAYOUT_RULES = {
  minWithdrawal: 500,
  tdsRatePan: 0.05,
  tdsRateNoPan: 0.2,
  processingFee: 10,
  processingFeeWaivedAbove: 2000,
} as const;

export interface PayoutBreakdown {
  gross: number;
  tdsRate: number;
  tds: number;
  processingFee: number;
  net: number;
  panVerified: boolean;
}

export function computePayout(grossInput: number, panVerified: boolean): PayoutBreakdown {
  const gross = Math.max(0, Math.round(grossInput * 100) / 100);
  const tdsRate = panVerified ? PAYOUT_RULES.tdsRatePan : PAYOUT_RULES.tdsRateNoPan;
  const tds = Math.round(gross * tdsRate * 100) / 100;
  const processingFee =
    gross >= PAYOUT_RULES.processingFeeWaivedAbove ? 0 : PAYOUT_RULES.processingFee;
  const net = Math.max(0, Math.round((gross - tds - processingFee) * 100) / 100);
  return { gross, tdsRate, tds, processingFee, net, panVerified };
}

export function withdrawalError(
  gross: number,
  settledBalance: number,
  opts: { kycApproved: boolean; frozen: boolean; hasBank: boolean },
): string | null {
  if (opts.frozen) return "Your account is on hold. Contact support to lift the freeze.";
  if (!opts.kycApproved) return "Complete KYC verification before requesting a withdrawal.";
  if (!opts.hasBank) return "Add your bank account details in KYC & Bank first.";
  if (!Number.isFinite(gross) || gross <= 0) return "Enter an amount to withdraw.";
  if (gross < PAYOUT_RULES.minWithdrawal)
    return `Minimum withdrawal is ₹${PAYOUT_RULES.minWithdrawal}.`;
  if (gross > settledBalance)
    return `You can withdraw up to ₹${settledBalance.toFixed(2)} (settled balance).`;
  return null;
}
