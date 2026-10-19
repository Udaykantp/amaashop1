import { getOfficeContext } from "@/server/office/context";
import { getIncomeView } from "@/server/office/data";
import { formatINR } from "@/lib/format";
import { formatRelativeTime } from "@/lib/member/time";

export const metadata = { title: "Income Statement" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  POSTED: "text-teal-700",
  PENDING: "text-amber-600",
  HELD: "text-slate-400",
  REVERSED: "text-red-600",
};

export default async function OfficeIncomePage() {
  const ctx = await getOfficeContext();
  const income = await getIncomeView(ctx.memberProfileId);

  return (
    <>
      <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">
        Income Statement
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Every commission credited to your wallet, by type and by entry.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { l: "Lifetime earnings", v: formatINR(income.lifetime), accent: true },
          { l: "This month", v: formatINR(income.thisMonth) },
          { l: "Pending / held", v: formatINR(income.pending) },
        ].map((s) => (
          <div
            key={s.l}
            className={`rounded-xl border p-4 shadow-sm ${
              s.accent ? "border-teal-200 bg-teal-50/50" : "border-slate-200 bg-white"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{s.l}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{s.v}</p>
          </div>
        ))}
      </div>

      {income.byType.length > 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-serif text-base font-medium text-slate-900">By income type</h2>
          <ul className="space-y-2">
            {income.byType.map((t) => (
              <li key={t.type} className="flex items-center justify-between text-sm">
                <span className="capitalize text-slate-600">
                  {t.type.replace(/_/g, " ").toLowerCase()}{" "}
                  <span className="text-slate-400">({t.count})</span>
                </span>
                <span className="font-semibold tabular-nums text-slate-800">{formatINR(t.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="font-serif text-base font-medium text-slate-900">Ledger</h2>
        </div>
        {income.recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Level</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-5 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {income.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-2.5 capitalize text-slate-700">
                      {r.type.replace(/_/g, " ").toLowerCase()}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-500">L{r.level}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.from}</td>
                    <td className="px-3 py-2.5 text-slate-400">{formatRelativeTime(r.when)}</td>
                    <td className={`px-3 py-2.5 font-medium ${STATUS_TONE[r.status] ?? "text-slate-500"}`}>
                      {r.status.toLowerCase()}
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-teal-700">
                      + {formatINR(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
