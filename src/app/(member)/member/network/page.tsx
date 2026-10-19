import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ReferralShare } from "@/components/member/referral-share";
import { NetworkLevels } from "@/components/member/network-levels";
import { EmptyState } from "@/components/patterns/empty-state";
import { MoneyAmount } from "@/components/patterns/money-amount";
import { PageHeader } from "@/components/patterns/page-header";
import { SetupNotice } from "@/components/patterns/setup-notice";
import { StatCard } from "@/components/patterns/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMemberContext } from "@/server/member/context";
import { getMemberDashboard, getNetworkSummary } from "@/server/member/overview";

export const metadata: Metadata = { title: "Your team" };

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const ctx = await getMemberContext();
  const [summary, dash] = await Promise.all([
    getNetworkSummary(ctx.memberProfileId),
    getMemberDashboard(ctx.memberProfileId),
  ]);
  const isPreview = ctx.preview || summary.preview;
  const totalEarned = summary.levels.reduce((s, l) => s + Number(l.earned), 0).toFixed(2);

  return (
    <>
      {isPreview ? <SetupNotice missing={ctx.missing} /> : null}

      <PageHeader
        title="Your team"
        description="Everyone in your binary team — your left and your right — grouped by how far below you they sit. Tap a level to see who's in it."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total team" value={summary.totals.totalTeam} hint={`${summary.totals.directReferrals} referred by you`} icon={Users} />
        <StatCard label="Joined this month" value={summary.totals.joinedThisMonth} hint={`Deepest level: ${summary.totals.deepestLevel}`} />
        <StatCard label="Earned from your team" value={<MoneyAmount value={totalEarned} size="lg" />} hint="Across all levels, credited" emphasis />
      </div>

      <div className="mt-6">
        {summary.totals.totalTeam === 0 ? (
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <EmptyState
                icon={Users}
                title="Your team will appear here as people join under you"
                action={<div className="w-full max-w-md"><ReferralShare memberCode={dash.memberCode} /></div>}
              >
                Share your referral link to get started. Choose a left-team or right-team link to decide which side
                new people join; if that spot is taken they are placed beneath your team and you still get the credit.
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Your team by level</h2>
            <NetworkLevels levels={summary.levels} />
            <p className="mt-3 text-xs text-muted-foreground">
              Level 1 is the two people directly under you (one on each side); Level 2 is the people under them, and so on.
            </p>
          </>
        )}
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader>
          <CardTitle className="font-serif text-lg font-medium">Invite someone</CardTitle>
        </CardHeader>
        <CardContent>
          <ReferralShare memberCode={dash.memberCode} />
        </CardContent>
      </Card>
    </>
  );
}
