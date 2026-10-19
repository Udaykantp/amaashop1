import { Check, Lock } from "lucide-react";
import { getOfficeContext } from "@/server/office/context";
import { getRankProgress } from "@/server/office/data";

export const metadata = { title: "Rank & Rewards" };
export const dynamic = "force-dynamic";

const REWARDS: Record<string, string> = {
  Distributor: "Retail margin + Level 0 sponsor bonus",
  Silver: "+ 1% team bonus pool · welcome kit",
  Gold: "+ 2% team bonus pool · quarterly gift voucher",
  Platinum: "+ 3% pool · annual leadership retreat",
  Diamond: "+ 4% pool · car fund · stage recognition",
};

export default async function OfficeRankPage() {
  const ctx = await getOfficeContext();
  const rank = await getRankProgress(ctx.memberProfileId);

  return (
    <>
      <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">
        Rank &amp; Rewards
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Your position on the AmaaShop ladder and what unlocks next. Criteria are subject to the
        active compensation plan.
      </p>

      <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50/50 p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current rank</p>
        <p className="mt-0.5 font-serif text-2xl font-medium text-teal-800">{rank.current}</p>
        <p className="mt-1 text-sm text-slate-600">
          {rank.directs} direct · {rank.team} total team
          {rank.next && rank.nextNeeds
            ? ` — need +${rank.nextNeeds.directs} direct, +${rank.nextNeeds.team} team for ${rank.next}`
            : " — top rank reached"}
        </p>
      </div>

      <ol className="mt-6 space-y-3">
        {rank.ladder.map((r, i) => {
          const isCurrent = r.name === rank.current;
          return (
            <li
              key={r.name}
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                isCurrent
                  ? "border-teal-300 bg-white shadow-sm"
                  : r.reached
                    ? "border-slate-200 bg-white"
                    : "border-slate-200 bg-slate-50/60"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  r.reached ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-400"
                }`}
              >
                {r.reached ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800">{r.name}</p>
                  {isCurrent ? (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                      You are here
                    </span>
                  ) : null}
                  {!r.reached ? <Lock className="h-3.5 w-3.5 text-slate-300" /> : null}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Qualify: {r.directs} direct referrals · {r.team} total team members
                </p>
                <p className="mt-1 text-sm text-slate-600">{REWARDS[r.name]}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
