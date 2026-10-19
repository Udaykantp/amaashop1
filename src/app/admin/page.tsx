import { AlertTriangle, Network, ShieldCheck, UserPlus, Wallet } from "lucide-react";
import Link from "next/link";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminGuard } from "@/server/admin/context";
import { getAdminMetrics } from "@/server/admin/metrics";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const gate = await adminGuard();
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const m = await getAdminMetrics();
  const attention: { label: string; href: string }[] = [];
  if (m.pendingApplications > 0)
    attention.push({
      label: `${m.pendingApplications} distributor registration(s) to review`,
      href: "/admin/applications",
    });
  if (m.kycQueue > 0) attention.push({ label: `${m.kycQueue} KYC submission(s) awaiting review`, href: "/admin/kyc" });
  if (m.commissionJobs.deadLetter > 0)
    attention.push({ label: `${m.commissionJobs.deadLetter} commission job(s) in dead-letter`, href: "/admin/audit" });
  if (m.payoutBatches.processing > 0)
    attention.push({ label: `${m.payoutBatches.processing} payout batch(es) processing`, href: "/admin/payouts" });
  if (m.lowStockSkus > 0)
    attention.push({ label: `${m.lowStockSkus} SKU(s) low on stock`, href: "/admin/catalog" });

  return (
    <>
      <PageHeader
        title={`Welcome, ${gate.user.displayName?.split(" ")[0] ?? "Admin"}`}
        description="What needs attention today."
      />

      {attention.length > 0 ? (
        <Card className="mb-6 border-warning/40 bg-warning/5 shadow-card">
          <CardHeader className="flex-row items-center gap-2 pb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <CardTitle className="text-sm font-semibold">Needs attention</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {attention.map((a) => (
                <li key={a.href}>
                  <Link href={a.href} className="text-primary hover:underline">
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <p className="mb-6 rounded-lg border border-success/30 bg-success/5 px-4 py-2.5 text-sm text-success">
          All clear — nothing needs your attention right now.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Distributors" value={m.members.total} hint={`${m.members.joinedThisMonth} joined this month`} icon={Network} />
        <StatCard label="New registrations" value={m.pendingApplications} hint="Waiting for review" icon={UserPlus} />
        <StatCard label="Pending KYC" value={m.members.pendingKyc} hint="Not yet verified" icon={ShieldCheck} />
        <StatCard label="Payout batches" value={m.payoutBatches.draft + m.payoutBatches.processing} hint={`${m.payoutBatches.draft} draft`} icon={Wallet} />
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader>
          <CardTitle className="font-serif text-lg font-medium">Active commission plan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {m.activeRuleSet ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{m.activeRuleSet.name}</p>
                <p className="text-muted-foreground">
                  Effective from {new Date(m.activeRuleSet.effectiveFrom).toLocaleDateString("en-IN")}
                  {m.activeRuleSet.confirmPending > 0
                    ? ` · ${m.activeRuleSet.confirmPending} value(s) pending founder confirmation`
                    : ""}
                </p>
              </div>
              <Link href="/admin/commission" className="text-primary hover:underline">
                Manage rules
              </Link>
            </div>
          ) : (
            <p className="text-muted-foreground">No active rule set — run the seed.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
