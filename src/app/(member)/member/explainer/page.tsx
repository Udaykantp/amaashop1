import type { Metadata } from "next";
import Link from "next/link";
import { PlanExplainer } from "@/components/member/plan-explainer";
import { PageHeader } from "@/components/patterns/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "How the plan works" };

export default function ExplainerPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="How the plan works" description="Your plan, in plain terms — with the actual numbers." />
      <PlanExplainer />
      <div className="mt-6 rounded-xl border bg-card p-5 shadow-card">
        <h2 className="font-serif text-lg font-medium">Where your ₹10 trust contribution goes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ₹10 of every joining package goes into a trust/temple fund, recorded in an append-only
          ledger. A public transparency report will be published here.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/trust-fund">View the trust fund report</Link>
        </Button>
      </div>
    </div>
  );
}
