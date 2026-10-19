import { Gift, RefreshCw, Users } from "lucide-react";
import { formatINR } from "@/lib/format";
import { PLAN_FACTS } from "@/lib/member/plan-facts";
import { cn } from "@/lib/utils";

/**
 * First-run explainer (brief §5.2): what "level", "team", and "repurchase
 * commission" mean in THIS plan, using its real numbers — not generic MLM
 * jargon.
 */
export function PlanExplainer({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-card", className)}>
      <h2 className="font-serif text-lg font-medium">How you earn</h2>
      <ol className="mt-4 space-y-4">
        <li className="flex gap-3">
          <Step icon={Users} n={1} />
          <div>
            <p className="text-sm font-medium text-foreground">Build a team</p>
            <p className="text-sm text-muted-foreground">
              People who join with your referral link are <strong>Level 1</strong>. People they bring
              in are your <strong>Level 2</strong>, and so on — down to <strong>Level 20</strong>.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <Step icon={Gift} n={2} />
          <div>
            <p className="text-sm font-medium text-foreground">Earn a joining bonus</p>
            <p className="text-sm text-muted-foreground">
              Every time someone joins anywhere in your team, you get a one-time bonus based on how
              many levels above them you are:
            </p>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {PLAN_FACTS.levelIncome.map((tier) => (
                <li key={tier.levels} className="flex justify-between gap-2 rounded bg-muted/50 px-2 py-1">
                  <span className="text-muted-foreground">{tier.levels}</span>
                  <span className="font-medium tabular-nums">{formatINR(tier.perLevelRs)}</span>
                </li>
              ))}
            </ul>
          </div>
        </li>
        <li className="flex gap-3">
          <Step icon={RefreshCw} n={3} />
          <div>
            <p className="text-sm font-medium text-foreground">Earn on repurchases</p>
            <p className="text-sm text-muted-foreground">
              When anyone in your team reorders products, a share of that order value is split back
              through the levels above them, into your wallet.
            </p>
          </div>
        </li>
      </ol>

      <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
        Joining package: {formatINR(PLAN_FACTS.joiningPriceRs)} (includes a{" "}
        {formatINR(PLAN_FACTS.trustContributionRs)} trust contribution).
        {PLAN_FACTS.pendingConfirmation ? " Final figures are being confirmed." : ""}
      </p>
    </div>
  );
}

function Step({ icon: Icon, n }: { icon: typeof Users; n: number }) {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon className="h-4 w-4" aria-hidden />
      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
        {n}
      </span>
    </span>
  );
}
