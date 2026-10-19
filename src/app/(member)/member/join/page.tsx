import type { Metadata } from "next";
import Link from "next/link";
import { JoinForm } from "@/components/member/join-form";
import { PlanExplainer } from "@/components/member/plan-explainer";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { parseLeg } from "@/lib/join/leg";
import { normalizeMemberCode } from "@/server/network/member-code";

export const metadata: Metadata = { title: "Join the network" };

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; leg?: string }>;
}) {
  const { ref, leg } = await searchParams;
  const prefill = ref ? normalizeMemberCode(ref) ?? "" : "";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Become an AmaaShop distributor"
        description="Join a sponsor's team, earn a bonus each time someone joins below you, and a commission every time your team reorders."
      />

      <PlanExplainer className="mb-6" />

      <Card className="shadow-card">
        <CardContent className="pt-6">
          <JoinForm defaultRef={prefill} defaultLeg={parseLeg(leg) ?? ""} />
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Just want to shop?{" "}
        <Link href="/" className="text-primary hover:underline">
          Go to the store
        </Link>
      </p>
    </div>
  );
}
