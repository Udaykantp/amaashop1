import { ArrowRight, ShieldCheck, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { ReferralShare } from "@/components/member/referral-share";
import { EmptyState } from "@/components/patterns/empty-state";
import { MoneyAmount } from "@/components/patterns/money-amount";
import { PageHeader } from "@/components/patterns/page-header";
import { SetupNotice } from "@/components/patterns/setup-notice";
import { StatCard } from "@/components/patterns/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activitySentence, kycNextStep, ledgerStatusNote } from "@/lib/member/labels";
import { formatRelativeTime } from "@/lib/member/time";
import { getMemberContext } from "@/server/member/context";
import { getMemberDashboard } from "@/server/member/overview";

// Per-member data behind auth — never cache or prerender.
export const dynamic = "force-dynamic";

export default async function MemberDashboardPage() {
  const ctx = await getMemberContext();
  const data = await getMemberDashboard(ctx.memberProfileId);
  const kyc = kycNextStep(data.kycStatus);
  const isPreview = ctx.preview || data.preview;

  return (
    <>
      {isPreview ? <SetupNotice missing={ctx.missing} /> : null}

      <PageHeader
        title={`Namaste, ${data.name.split(" ")[0]}`}
        description="Here's how your AmaaShop network is doing."
      />

      {/* Three answers, above the fold (brief §5.3) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Money you've earned"
          value={<MoneyAmount value={data.walletBalance} size="lg" />}
          hint={`${
            data.withdrawableBalance === data.walletBalance ? "All" : "₹" + data.withdrawableBalance
          } available to withdraw`}
          icon={Wallet}
          emphasis
          footer={
            <Button asChild size="sm" variant="outline">
              <Link href="/member/wallet">View transactions</Link>
            </Button>
          }
        />
        <StatCard
          label="New team members this month"
          value={data.teamThisMonth}
          hint={`${data.totalTeam} in your team overall`}
          icon={Users}
          footer={
            <Button asChild size="sm" variant="outline">
              <Link href="/member/network">See your team</Link>
            </Button>
          }
        />
        <StatCard
          label="KYC status"
          value={<span className={kyc.done ? "text-success" : undefined}>{kyc.label}</span>}
          hint={kyc.done ? "Withdrawals enabled" : "Required before you can withdraw"}
          icon={ShieldCheck}
          footer={
            kyc.cta ? (
              <Button asChild size="sm" variant={kyc.done ? "outline" : "default"}>
                <Link href="/member/kyc">{kyc.cta}</Link>
              </Button>
            ) : undefined
          }
        />
      </div>

      {/* Grow your team */}
      <Card className="mt-6 shadow-card">
        <CardHeader>
          <CardTitle className="font-serif text-lg font-medium">Grow your team</CardTitle>
        </CardHeader>
        <CardContent>
          <ReferralShare memberCode={data.memberCode} />
        </CardContent>
      </Card>

      {/* Recent activity — plain sentences (brief §5.3) */}
      <Card className="mt-6 shadow-card">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-serif text-lg font-medium">Recent activity</CardTitle>
          <Link href="/member/wallet" className="text-sm text-primary hover:underline">
            All activity
          </Link>
        </CardHeader>
        <CardContent>
          {data.activity.length === 0 ? (
            <EmptyState icon={Wallet} title="No earnings yet">
              When someone joins under you or a team member reorders, you’ll see the bonus here —
              with a link to exactly which order and person it came from.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {data.activity.map((a) => {
                const note = ledgerStatusNote(a.status);
                return (
                  <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{activitySentence(a)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(a.when)} · {note.label}
                      </p>
                    </div>
                    <MoneyAmount value={a.amount} tone={note.tone === "debit" ? "debit" : "credit"} showSign />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/member/explainer" className="inline-flex items-center gap-1 text-primary hover:underline">
          How joining bonuses and levels work <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </>
  );
}
