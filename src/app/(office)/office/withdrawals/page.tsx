import { WithdrawalForm } from "@/components/office/withdrawal-form";
import { getOfficeContext } from "@/server/office/context";
import { getKycView, getWalletView, getWithdrawalsView } from "@/server/office/data";
import { formatINR } from "@/lib/format";
import { formatRelativeTime } from "@/lib/member/time";

export const metadata = { title: "Withdrawals" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "In review", cls: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Approved", cls: "bg-sky-100 text-sky-800" },
  ON_HOLD: { label: "On hold", cls: "bg-slate-100 text-slate-600" },
  REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-700" },
  PAID: { label: "Paid", cls: "bg-teal-100 text-teal-800" },
};

export default async function OfficeWithdrawalsPage() {
  const ctx = await getOfficeContext();
  const [wallet, kyc, view] = await Promise.all([
    getWalletView(ctx.userId),
    getKycView(ctx.userId),
    getWithdrawalsView(ctx.userId),
  ]);

  return (
    <>
      <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">Withdrawals</h1>
      <p className="mt-1 text-sm text-slate-500">
        Move your settled earnings to your bank. TDS (s.194H) and the processing fee are shown
        upfront.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[360px_1fr]">
        <WithdrawalForm
          settledBalance={Number(wallet.settled)}
          panVerified={kyc.panVerified}
          kycApproved={kyc.status === "APPROVED"}
          hasBank={kyc.hasBank}
          frozen={ctx.frozen}
          bankLast4={kyc.bankLast4}
        />

        <div>
          <div className="mb-3 flex gap-3">
            <div className="flex-1 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs text-slate-400">Total paid out</p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">
                {formatINR(view.totalPaid)}
              </p>
            </div>
            <div className="flex-1 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs text-slate-400">In progress</p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">
                {formatINR(view.totalPending)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-slate-700">History</h2>
            </div>
            {view.list.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No withdrawals yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {view.list.map((w) => {
                  const s = STATUS[w.status] ?? { label: w.status, cls: "bg-slate-100 text-slate-600" };
                  return (
                    <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="font-semibold tabular-nums text-slate-800">
                          {formatINR(w.amount)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatRelativeTime(w.requestedAt)}
                          {w.bankLast4 ? ` · a/c ••${w.bankLast4}` : ""}
                          {w.note ? ` · ${w.note}` : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
