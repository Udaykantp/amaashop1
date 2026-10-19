"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { requestWithdrawalAction } from "@/actions/office";
import { formatINR } from "@/lib/format";
import { computePayout, PAYOUT_RULES, withdrawalError } from "@/lib/office/payout";

export function WithdrawalForm({
  settledBalance,
  panVerified,
  kycApproved,
  hasBank,
  frozen,
  bankLast4,
}: {
  settledBalance: number;
  panVerified: boolean;
  kycApproved: boolean;
  hasBank: boolean;
  frozen: boolean;
  bankLast4: string | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const gross = Number(amount) || 0;
  const breakdown = useMemo(() => computePayout(gross, panVerified), [gross, panVerified]);
  const blocker = withdrawalError(gross, settledBalance, { kycApproved, frozen, hasBank });
  const canSubmit = gross > 0 && !blocker && !pending;

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await requestWithdrawalAction(amount);
      if (res.ok) {
        setMsg({ tone: "ok", text: res.message });
        setAmount("");
        router.refresh();
      } else {
        setMsg({ tone: "err", text: res.error });
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-base font-medium text-slate-900">Request a withdrawal</h2>
        <span className="text-xs text-slate-500">
          Settled balance <span className="font-semibold text-slate-700">{formatINR(settledBalance)}</span>
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            ₹
          </span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            className="h-10 w-full rounded-lg border border-slate-200 pl-7 pr-3 text-sm tabular-nums shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>
        <button
          type="button"
          onClick={() => setAmount(String(Math.floor(settledBalance)))}
          className="rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Max
        </button>
      </div>

      {gross > 0 ? (
        <dl className="mt-4 space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Amount requested</dt>
            <dd className="tabular-nums text-slate-800">{formatINR(breakdown.gross)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">
              TDS ({(breakdown.tdsRate * 100).toFixed(0)}% — s.194H{panVerified ? ", PAN verified" : ", no PAN"})
            </dt>
            <dd className="tabular-nums text-red-600">− {formatINR(breakdown.tds)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">
              Processing fee{breakdown.processingFee === 0 ? " (waived)" : ""}
            </dt>
            <dd className="tabular-nums text-red-600">− {formatINR(breakdown.processingFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold">
            <dt className="text-slate-700">You receive</dt>
            <dd className="tabular-nums text-teal-700">{formatINR(breakdown.net)}</dd>
          </div>
          <p className="pt-1 text-xs text-slate-400">
            To bank a/c ••{bankLast4 ?? "----"} · usually settled in 2–3 working days after Finance approval
          </p>
        </dl>
      ) : null}

      {blocker && gross > 0 ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{blocker}</p>
      ) : null}
      {msg ? (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            msg.tone === "ok" ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={submit}
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Submit request
      </button>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Minimum ₹{PAYOUT_RULES.minWithdrawal}. Reviewed by the Finance team before payout.
      </p>
    </div>
  );
}
