import { getNetworkSummary } from "@/server/member/overview";
import { getOfficeContext } from "@/server/office/context";
import { ReferralShare } from "@/components/member/referral-share";

export const metadata = { title: "Sponsoring" };
export const dynamic = "force-dynamic";

export default async function OfficeReferralsPage() {
  const ctx = await getOfficeContext();
  const summary = await getNetworkSummary(ctx.memberProfileId);

  return (
    <>
      <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">Sponsoring</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your replicated link and code. You get the referral credit for everyone who joins through it; choose a left-team or right-team link to decide which side of your team they are placed on.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { l: "Referred by you", v: summary.totals.directReferrals },
          { l: "Total team", v: summary.totals.totalTeam },
          { l: "Joined this month", v: summary.totals.joinedThisMonth },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{s.l}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{s.v}</p>
          </div>
        ))}
      </div>

      {ctx.frozen ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your referral link is disabled while your account is on hold.
        </p>
      ) : (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-serif text-base font-medium text-slate-900">Your referral link</h2>
          <ReferralShare memberCode={ctx.memberCode} />
        </div>
      )}

      <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-700">Tips that convert</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
          <li>• Share the QR in person — scans convert far better than pasted links.</li>
          <li>• Send the link with a one-line note about the product, not the plan.</li>
          <li>• Follow up within 24 hours of someone showing interest.</li>
        </ul>
      </div>
    </>
  );
}
