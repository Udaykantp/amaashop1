"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, requireMember } from "@/server/auth/guards";
import { writeAudit } from "@/server/audit";
import { Collections, collection, doc, nowSentinel } from "@/server/firestore";
import type { KycProfileDoc, MemberProfileDoc, WalletDoc, WithdrawalRequestDoc } from "@/server/models";
import { log } from "@/server/log";
import { moneyToFirestore } from "@/server/money";
import { computePayout, withdrawalError } from "@/lib/office/payout";

export type OfficeResult = { ok: true; message: string } | { ok: false; error: string };

const amountSchema = z.coerce.number().finite().positive().max(10_000_000);

/**
 * Distributor-initiated withdrawal request. Creates a PENDING
 * `WithdrawalRequest` for the Finance Admin desk to review — it does NOT debit
 * the wallet here (that happens on approval / payout). The TDS + fee breakdown
 * is recorded on the audit trail so the amount the distributor saw is captured.
 */
export async function requestWithdrawalAction(amountInput: string): Promise<OfficeResult> {
  try {
    const user = await requireMember();
    const gross = amountSchema.parse(amountInput);

    const [kycSnap, walletSnap, profileSnap] = await Promise.all([
      doc(Collections.kycProfiles, user.uid).get(),
      doc(Collections.wallets, user.uid).get(),
      doc(Collections.memberProfiles, user.memberProfileId).get(),
    ]);
    const kyc = kycSnap.exists ? (kycSnap.data() as KycProfileDoc) : null;
    const wallet = walletSnap.exists ? (walletSnap.data() as WalletDoc) : null;
    const profile = profileSnap.exists ? (profileSnap.data() as MemberProfileDoc) : null;

    const settled = Number(wallet?.settledBalance ?? "0");
    const kycApproved = kyc?.status === "APPROVED";
    const panVerified = kycApproved && Boolean(kyc?.panLast4);

    const err = withdrawalError(gross, settled, {
      kycApproved,
      frozen: Boolean(profile?.frozenAt),
      hasBank: Boolean(kyc?.bankAccountLast4),
    });
    if (err) return { ok: false, error: err };

    const breakdown = computePayout(gross, panVerified);

    const data: WithdrawalRequestDoc = {
      userId: user.uid,
      amount: moneyToFirestore(gross),
      status: "PENDING",
      bankAccountLast4: kyc?.bankAccountLast4 ?? null,
      ifsc: kyc?.ifsc ?? null,
      requestedAt: nowSentinel(),
      reviewedByUserId: null,
      reviewedAt: null,
      reviewNote: null,
      payoutItemId: null,
      createdAt: nowSentinel(),
    };
    const ref = await collection(Collections.withdrawalRequests).add(data);

    await writeAudit({
      actorUserId: user.uid,
      action: "withdrawal.request",
      entity: "withdrawal_request",
      entityId: ref.id,
      after: {
        gross: breakdown.gross,
        tdsRate: breakdown.tdsRate,
        tds: breakdown.tds,
        processingFee: breakdown.processingFee,
        net: breakdown.net,
        panVerified,
      },
    });

    revalidatePath("/office/withdrawals");
    revalidatePath("/office/wallet");
    revalidatePath("/office");

    return {
      ok: true,
      message: `Request for ₹${breakdown.gross.toFixed(2)} submitted. After ${(
        breakdown.tdsRate * 100
      ).toFixed(0)}% TDS${
        breakdown.processingFee ? ` and a ₹${breakdown.processingFee} fee` : ""
      }, you'll receive about ₹${breakdown.net.toFixed(2)}.`,
    };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: "Enter a valid amount." };
    log.error("withdrawal request failed", { err: String(e) });
    return { ok: false, error: "Could not submit the request. Please try again." };
  }
}
