import { ArrowUpRight, Banknote, Coins, ShieldCheck, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { getMemberDashboard, getNetworkSummary } from "@/server/member/overview";
import { getOfficeContext } from "@/server/office/context";
import { getIncomeView, getRankProgress, getWalletView } from "@/server/office/data";
import { formatINR } from "@/lib/format";
import { formatRelativeTime } from "@/lib/member/time";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  href,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Users;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col gap-1 rounded-xl border p-4 shadow-sm transition-colors ${
        accent
          ? "border-teal-200 bg-teal-50/50 hover:bg-teal-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <span className="text-2xl font-semibold tabular-nums text-slate-900">{value}</span>
      <span className="flex items-center gap-1 text-xs text-slate-500">
        {hint}
        <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
    </Link>
  );
}

export default async function OfficeDashboard() {
  const ctx = await getOfficeContext();
  const [dash, net, wallet, income, rank] = await Promise.all([
    getMemberDashboard(ctx.memberProfileId),
    getNetworkSummary(ctx.memberProfileId),
    getWalletView(ctx.userId),
    getIncomeView(ctx.memberProfileId),
    getRankProgress(ctx.memberProfileId),
  ]);

  const kycOk = dash.kycStatus === "APPROVED";

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">
          Namaste, {(ctx.displayName ?? "Distributor").split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {rank.current} rank · {net.totals.totalTeam} in your team ·{" "}
          {net.totals.joinedThisMonth} joined this month
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Wallet balance"
          value={formatINR(wallet.balance)}
          hint={`${formatINR(wallet.settled)} withdrawable`}
          icon={Coins}
          href="/office/wallet"
          accent
        />
        <Stat
          label="Earned this month"
          value={formatINR(income.thisMonth)}
          hint={`${formatINR(income.lifetime)} lifetime`}
          icon={TrendingUp}
          href="/office/income"
        />
        <Stat
          label="Your team"
          value={String(net.totals.totalTeam)}
          hint={`${net.totals.directReferrals} referred by you`}
          icon={Users}
          href="/office/team"
        />
        <Stat
          label="Pending payout"
          value={formatINR(wallet.onHoldForWithdrawal)}
          hint="Awaiting Finance review"
          icon={Banknote}
          href="/office/withdrawals"
        />
      </div>

      {/* Rank progress */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base font-medium text-slate-900">Rank progress</h2>
          <Link href="/office/rank" className="text-xs font-medium text-teal-700 hover:underline">
            View rewards
          </Link>
        </div>
        {rank.next && rank.nextNeeds ? (
          <p className="mt-2 text-sm text-slate-600">
            You&apos;re <span className="font-semibold">{rank.current}</span>. To reach{" "}
            <span className="font-semibold text-teal-700">{rank.next}</span>, add{" "}
            {rank.nextNeeds.directs > 0 ? `${rank.nextNeeds.directs} direct referral(s)` : ""}
            {rank.nextNeeds.directs > 0 && rank.nextNeeds.team > 0 ? " and " : ""}
            {rank.nextNeeds.team > 0 ? `${rank.nextNeeds.team} more team member(s)` : ""}.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            You&apos;re at the top rank — <span className="font-semibold">{rank.current}</span>. 🎉
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {rank.ladder.map((r) => (
            <span
              key={r.name}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                r.reached ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-400"
              }`}
            >
              {r.name}
            </span>
          ))}
        </div>
      </div>

      {/* KYC nudge */}
      {!kycOk ? (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Finish KYC to unlock withdrawals
              </p>
              <p className="text-xs text-amber-800">
                PAN, Aadhaar and a bank account are needed before you can move money out.
              </p>
            </div>
          </div>
          <Link
            href="/office/kyc"
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Complete KYC
          </Link>
        </div>
      ) : null}

      {/* Recent earnings */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="font-serif text-base font-medium text-slate-900">Recent earnings</h2>
          <Link href="/office/income" className="text-xs font-medium text-teal-700 hover:underline">
            Full statement
          </Link>
        </div>
        {income.recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No commissions yet. When someone joins under you or your team reorders, it shows here.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {income.recent.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-800">
                    {r.type.replace(/_/g, " ").toLowerCase()} · L{r.level} · from {r.from}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatRelativeTime(r.when)} · {r.status.toLowerCase()}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-teal-700">
                  + {formatINR(r.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
