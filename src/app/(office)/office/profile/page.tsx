import { getMemberDashboard } from "@/server/member/overview";
import { getOfficeContext } from "@/server/office/context";
import { OfficeSecurityActions } from "@/components/office/office-security-actions";

export const metadata = { title: "Profile & Security" };
export const dynamic = "force-dynamic";

export default async function OfficeProfilePage() {
  const ctx = await getOfficeContext();
  const dash = await getMemberDashboard(ctx.memberProfileId).catch(() => null);

  const fields = [
    { label: "Name", value: ctx.displayName ?? "—" },
    { label: "Email", value: ctx.email ?? "—" },
    { label: "Distributor code", value: ctx.memberCode, mono: true },
    { label: "Account status", value: ctx.status.replace(/_/g, " ").toLowerCase() },
    { label: "KYC", value: (dash?.kycStatus ?? "NOT_SUBMITTED").replace(/_/g, " ").toLowerCase() },
  ];

  return (
    <>
      <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">
        Profile &amp; Security
      </h1>
      <p className="mt-1 text-sm text-slate-500">Your account details and sign-in settings.</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-base font-medium text-slate-900">Account</h2>
          <dl className="mt-3 divide-y divide-slate-100">
            {fields.map((f) => (
              <div key={f.label} className="flex justify-between gap-4 py-2.5 text-sm">
                <dt className="text-slate-500">{f.label}</dt>
                <dd className={`text-right text-slate-800 ${f.mono ? "font-mono" : "capitalize"}`}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            To change your name or email, contact support — these are tied to KYC.
          </p>
        </div>

        <OfficeSecurityActions email={ctx.email} />
      </div>
    </>
  );
}
