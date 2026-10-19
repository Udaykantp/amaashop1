import Link from "next/link";
import { getOfficeContext } from "@/server/office/context";
import { getWalletView } from "@/server/office/data";
import { formatINR } from "@/lib/format";
import { formatRelativeTime } from "@/lib/member/time";

export const metadata = { title: "E-Wallet" };
export const dynamic = "force-dynamic";

const TXN_LABEL: Record<string, string> = {
  CREDIT_COMMISSION: "Commission credit",
  DEBIT_WITHDRAWAL: "Withdrawal",
  DEBIT_CLAWBACK: "Clawback",
  CREDIT_REFUND: "Refund",
  ADJUSTMENT: "Adjustment",
};

export default async function OfficeWalletPage() {
  const ctx = await getOfficeContext();
  const wallet = await getWalletView(ctx.userId);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">E-Wallet</h1>
          <p className="mt-1 text-sm text-slate-500">Your commission wallet and its full ledger.</p>
        </div>
        <Link
          href="/office/withdrawals"
          className="shrink-0 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Withdraw
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Balance</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">
            {formatINR(wallet.balance)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Withdrawable (settled)
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">
            {formatINR(wallet.settled)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Reserved for payout
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">
            {formatINR(wallet.onHoldForWithdrawal)}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="font-serif text-base font-medium text-slate-900">Transactions</h2>
        </div>
        {wallet.transactions.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No wallet activity yet. Commissions land here once a payout run is released.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {wallet.transactions.map((t) => {
              const credit = Number(t.amount) >= 0;
              return (
                <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">{TXN_LABEL[t.type] ?? t.type}</p>
                    <p className="text-xs text-slate-400">
                      {formatRelativeTime(t.when)}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`font-semibold tabular-nums ${
                        credit ? "text-teal-700" : "text-red-600"
                      }`}
                    >
                      {credit ? "+" : ""}
                      {formatINR(t.amount)}
                    </p>
                    <p className="text-xs text-slate-400 tabular-nums">
                      bal {formatINR(t.balanceAfter)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
