/**
 * Display copy for the compensation plan, shown to members in the join
 * explainer. These MIRROR the seeded `CommissionRuleSet` (docs/COMMISSION-PLAN.md)
 * — they are not the source of truth for payouts, only for explaining the plan.
 * Several values are still pending founder confirmation (`pendingConfirmation`).
 *
 * TODO(phase 4): load these from the active CommissionRuleSet so the explainer
 * can never drift from what the engine actually pays.
 */
export const PLAN_FACTS = {
  joiningPriceRs: 700,
  trustContributionRs: 10,
  levelCount: 21, // Level 0..20
  levelIncome: [
    { levels: "Level 0 (your sponsor)", perLevelRs: 400, note: "direct sponsor bonus" },
    { levels: "Levels 1–4", perLevelRs: 25, note: "" },
    { levels: "Levels 5–8", perLevelRs: 20, note: "" },
    { levels: "Levels 9–12", perLevelRs: 15, note: "" },
    { levels: "Levels 13–16", perLevelRs: 7.5, note: "" },
    { levels: "Levels 17–20", perLevelRs: 5, note: "" },
  ],
  totalLevelIncomeRs: 690,
  repurchasePoolPct: 10,
  pendingConfirmation: true,
} as const;
