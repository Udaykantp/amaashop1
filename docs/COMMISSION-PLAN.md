# Compensation Plan — Configuration Register

Every number below comes from the founder's planning notes and is **stored as a
row**, never coded as a constant. The engine reads the `CommissionRuleSet` whose
effective window contains the source order's confirmation time.

`[CONFIRM]` = founder / CA / legal sign-off still required. Until confirmed we
ship the documented value as the default and flag it in the admin console.

---

## 1. `CommissionRuleSet.ruleJson` shape

```jsonc
{
  "networkDepth": 20,                       // Level 0..20 inclusive
  "joiningPackagePriceRs": "700.00",        // [CONFIRM] = 690 level income + 10 trust
  "trustContributionRs": "10.00",           // [CONFIRM]
  "placementStrategy": "UNILEVEL",          // UNILEVEL | BINARY | MATRIX

  "levelIncome": [                          // one-time, on a new member joining
    { "levelFrom": 0,  "levelTo": 0,  "amountRs": "400.00" },
    { "levelFrom": 1,  "levelTo": 4,  "amountRs": "25.00"  },
    { "levelFrom": 5,  "levelTo": 8,  "amountRs": "20.00"  },
    { "levelFrom": 9,  "levelTo": 12, "amountRs": "15.00"  },  // L11 handwritten "18" — [CONFIRM], treated as 15
    { "levelFrom": 13, "levelTo": 16, "amountRs": "7.50"   },
    { "levelFrom": 17, "levelTo": 20, "amountRs": "5.00"   }
  ],
  // sum = 400 + 100 + 80 + 60 + 30 + 20 = 690.00

  "repurchase": {                           // recurring, on every downline reorder
    "poolBps": 1000,                        // 10% of order value — [CONFIRM exact %]
    "decaySplits": [5000, 2500, 1250, 625], // bps of the pool per qualifying tier; remainder rolls to the tail
    "x5Interpretation": "QUALIFYING_LEVELS", // QUALIFYING_LEVELS | MEMBERS_REQUIRED_TO_UNLOCK — [CONFIRM]
    "tailSplitAcross": 5                     // meaning of the notes' "×5" — [CONFIRM]
  },

  "qualification": {                        // "Payment after 6 [?]" — [CONFIRM meaning]
    "minPersonalPurchaseRs": "0.00",
    "minDirectReferrals": 0,                // candidate reading: 6 direct joins
    "holdPeriodDays": 0                     // candidate reading: 6 days / 6 months
  },

  "breakagePolicy": "FORFEIT",              // FORFEIT | ROLL_UP | ESCROW — [CONFIRM]

  "trust": {
    "flatPerJoiningRs": "10.00",            // [CONFIRM]
    "repurchaseCsrBps": 0,                  // "32% for Temple" against "20 Level" — [CONFIRM meaning]
    "note": "32% for Temple / 20 Level — unclear: payout-ratio cap vs separate CSR allocation"
  }
}
```

## 2. Level income table (documented)

| Level(s) | ₹ per level | Levels | Subtotal |
|---|---|---|---|
| 0 (direct sponsor) | 400.00 | 1 | 400.00 |
| 1–4 | 25.00 | 4 | 100.00 |
| 5–8 | 20.00 | 4 | 80.00 |
| 9–12 | 15.00 `[CONFIRM L11=18?]` | 4 | 60.00 |
| 13–16 | 7.50 | 4 | 30.00 |
| 17–20 | 5.00 | 4 | 20.00 |
| **21 levels** | | | **690.00** |
| Trust/Temple | flat | — | 10.00 |
| **Package** | | | **700.00** |

## 3. Repurchase decay (documented example, ₹500 pool base)

`250.00 → 125.00 → 62.50 → 31.25 → …` then remainder of the pool, "each further
split ×5". Both readings of "×5" are implemented behind
`repurchase.x5Interpretation`; **do not launch repurchase commission until the
founder confirms** which applies and the exact pool %.

## 4. Open items — must be closed before real money moves

- [ ] Joining price ₹700 and the 690 + 10 split.
- [ ] Level 11 rate: 15 or 18.
- [ ] Repurchase pool exact %, decay tail beyond 6.25%, meaning of "×5".
- [ ] "32% for Temple" against "20 Level".
- [ ] "Payment after 6" — joins / days / months / units.
- [ ] Network shape confirmed unilevel (assumed).
- [ ] Breakage/compression policy.
- [ ] The "4 websites" — deployments, sister brands, or external marketplaces.
- [ ] TDS threshold/rate on commission payouts (from CA).
- [ ] Legal sign-off vs India's Direct Selling Rules 2021 / money-circulation
      scheme restrictions.
