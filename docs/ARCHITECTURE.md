# AmaaShop Platform — Architecture Decision Record

_Last updated: 2026-08-28. This file is the source of truth for foundational
decisions. Change it via PR with a rationale, never silently._

---

## 1. What we are building

A production-grade platform with three pillars sharing one codebase and one
identity system:

1. **Storefront** — public e-commerce for direct consumers (FMCG/household goods).
2. **Member / Distributor Network** — a 21-level (Level 0–20) referral genealogy
   with joining bonus, level income, and repurchase commission paid into a
   member wallet.
3. **Admin Panel** — inventory & dispatch, GST/TDS reporting, commission-rule
   configuration, KYC approval, payouts, multi-site comparison.

The master brief lives in the founder's build prompt. Every business number in
it is treated as **configuration, not code** (see `COMMISSION-PLAN.md`).

---

## 2. Locked technology decisions

| Concern | Decision | Rationale |
|---|---|---|
| Framework | **Next.js 15 App Router**, TypeScript strict, React 19 | Already in place; server-first fits SEO + server actions. |
| UI | **Tailwind CSS 3 + shadcn/ui**, design tokens in `tailwind.config.ts` + `globals.css` | One design system across all three pillars (brief §5.8). |
| Identity | **Firebase Authentication** | Single identity pool for consumers, members, and admins. Session cookies verified server-side via Firebase Admin SDK. Roles carried as **custom claims** (`role`, `mfa`). |
| Admin 2FA | **TOTP**, mandatory on `/admin`, enforced in middleware + server guard | Brief §2 "console panel to be blocked" → separate hardened session flow. |
| Data store | **Firestore (native mode)**, via `firebase-admin`, `src/server/firestore.ts` | Migrated off Postgres/Prisma (2026-09) to consolidate on one Firebase stack. Guarantees Postgres gave for free — unique constraints, cascading deletes, multi-row transactions — are rebuilt deliberately: see `runUniqueTransaction` (unique-field locks), explicit cascade cleanup in `network/delete.ts`, and the bounded-transaction / chunked-batch split in `network/move.ts`. Data model: `src/server/models.ts`. |
| File storage | **Google Cloud Storage**, private bucket, V4 signed URLs only | KYC Aadhaar/PAN scans — never public (brief §4.1). |
| Async / fan-out | **`domain_events` + `commission_jobs` tables** now; interface `JobQueue` | Depth-20 commission fan-out must not block a checkout request. Swap the in-DB queue for **Cloud Tasks** without touching call sites. |
| Cache / rate-limit | Interface `KvStore`; in-memory dev impl → **Memorystore (Redis)** in prod | Wallet-balance cache, auth + payout rate limiting. |
| Payments | **Simulated** this phase — full ledger + payout batch + CSV export, no live gateway. `PaymentProvider` interface ready for **Razorpay/Cashfree**. | Founder decision: money movement simulated until KYC + compliance sign-off. |
| Hosting | **Firebase App Hosting / Cloud Run** for the Next.js app; **separate Cloud Run service** for the commission worker | Brief §4.1. Worker shares the Prisma schema, runs no user-facing routes. |
| Secrets | **Google Secret Manager**; never in the repo | — |
| Observability | Structured JSON logging (`src/server/log.ts`), Cloud Logging in prod | Every commission event and payout logged (brief §6). |
| CI/CD | GitHub Actions → Cloud Build → Cloud Run, staging + production | Brief §4.1. |

### Dev database

Local dev runs against the **Firebase emulator suite** (Auth + Firestore —
`npm run emulators` / `npm run dev:all`), or a real Firestore project when
`FIREBASE_SERVICE_ACCOUNT_JSON` is set. There is no separate schema/migration
step: Firestore is schemaless, so `src/server/models.ts` is the only source of
truth for document shape.

### Explicitly rejected

- **Supabase** — migrated off (2026-09) so the platform is one stack with one
  auth system. No dual-auth. `prisma/schema.prisma` and the `prisma` /
  `@prisma/client` devDependencies are kept **only** so
  `scripts/migrate-to-firestore.ts` (the one-time data migration) can still
  read the old production database; delete both once that migration is
  verified and Cloud SQL/Supabase are decommissioned.
- ~~Firestore for the financial core — considered; rejected because multi-entry
  clawback, TDS/GST aggregation, and provable ledger correctness are
  materially harder to get right in a document store.~~ **Superseded**: the
  full platform, including the financial core, now runs on Firestore. The
  correctness guarantees this note worried about are rebuilt explicitly in
  application code rather than relied on implicitly — see the Data store row
  above. The commission ledger → wallet posting pipeline itself was still
  unbuilt at migration time (see `docs/BUILD-PLAN.md`), so it's designed
  Firestore-native from the start rather than ported.
- **Hardcoded commission math** — the comp plan is a versioned row
  (`CommissionRuleSet.ruleJson`), never a constant in code.

---

## 3. Money

- All monetary values are **`Decimal(14,2)` rupees** in Postgres, surfaced as
  `Decimal.js` by Prisma. **Never `number`/float for money.**
- Arithmetic goes through `src/server/money.ts` helpers (`add`, `sub`, `mul`,
  `allocate` for remainder-safe splitting).
- The **`commission_ledger` is the source of truth**. `wallets.balance_cache`
  is a derived sum, only ever written alongside a `wallet_transactions` row in
  the same DB transaction. No code path mutates a wallet balance without a
  ledger entry.
- Reversals (clawback) **append a negative entry** referencing the original;
  ledger rows are immutable.

---

## 4. Identity & roles

| Role (custom claim `role`) | Surface |
|---|---|
| `SUPER_ADMIN` | Everything incl. commission-rule config, payout approval, role management |
| `OPS_ADMIN` | Inventory, dispatch, KYC review, reports — no commission-rule edit |
| `FINANCE_ADMIN` | Payout batches, GST/TDS reports, trust ledger — read-only elsewhere |
| `MEMBER` | Own dashboard: network, wallet, orders, KYC, family/nominee |
| `CONSUMER` | Storefront checkout only |
| _(no row / no claim)_ | Guest — browse + cart, must register to check out |

- `AppUser.id` **is the Firebase UID**.
- A consumer can later become a member — same `AppUser`, a `MemberProfile` row
  is added and the claim is upgraded `CONSUMER → MEMBER`.
- `/admin` is a **separate route group with its own session guard**, mandatory
  TOTP, optional IP allow-list, and full `audit_logs` on every mutation.

---

## 5. Genealogy model

- **Unilevel, 21 levels deep (Level 0 = direct sponsor, 1–20 = upline).**
- Placement is behind a **`PlacementStrategy` interface**
  (`src/server/network/placement.ts`); `UnilevelPlacement` is the only
  implementation today. Binary/matrix can be added without a schema change.
- **`network_closure(ancestor_id, descendant_id, depth)`** — one row per
  ancestor/descendant pair incl. self (`depth = 0`). On join, the new member's
  closure rows are all `(A, new, depth+1)` for every ancestor `A` of the
  sponsor, plus `(sponsor, new, 1)` and `(new, new, 0)` — a single indexed
  insert, no recursive walk.
- **Loop / self-referral prevention**: a member cannot sponsor themselves or
  any of their own ancestors. Enforced in the join transaction (check the
  sponsor is not already a descendant) and by a DB check constraint
  `ancestor_id <> descendant_id OR depth = 0`.
- Depth is capped at 20 for commission purposes but closure rows beyond 20 are
  still stored for reporting; the commission engine filters `depth <= 20`.

---

## 6. Commission engine (isolated service)

- Lives in `src/server/commission/` and is import-clean: no Next.js, no React,
  no `next/*`. The Cloud Run worker imports the same modules.
- Triggered by two domain events: **`MEMBER_JOINED`** (fires level income up to
  20 upline generations) and **`REPURCHASE_CONFIRMED`** (fires repurchase
  commission). **`ORDER_CANCELLED`** fires clawback.
- **Idempotent**: every ledger write carries an `idempotency_key`
  (`{sourceOrderId}:{type}:{beneficiaryId}:{level}`) with a unique constraint.
  A retried or duplicated event can never double-pay.
- **Async**: each upline payout is its own `commission_jobs` row with retry +
  dead-letter. A join enqueues jobs and returns; it does not fan out inline.
- **Breakage / compression** when an upline slot is missing or the member is
  inactive/un-KYC'd: policy is `CommissionRuleSet.ruleJson.breakagePolicy` ∈
  `FORFEIT | ROLL_UP | ESCROW`. `[CONFIRM with founder]` — default `FORFEIT`.
- **Rule versioning**: a payout is always computed against the `CommissionRuleSet`
  whose `[effectiveFrom, effectiveTo)` window contains the source order's
  `confirmedAt`. Editing rules never rewrites history.

---

## 7. Repository layout (target)

```
nextjs-app/
  docs/                     decision records, runbooks, this file
  prisma/
    schema.prisma           single schema, shared by app + worker
    migrations/
    seed.ts                 categories, sites, the initial CommissionRuleSet
  src/
    app/
      (storefront)/         public shop — existing, being ported off Supabase
      (member)/             member portal (dashboard, network, wallet, KYC)
      admin/                hardened admin panel, own layout + guard
      api/                  route handlers (webhooks, signed-URL mint, worker callbacks)
    components/
      ui/                   design-system primitives (shadcn-based)
      patterns/             composed patterns: EmptyState, ErrorState, StatCard,
                            DataTable, Stepper, LedgerRow, GenealogySummary
    server/                 NO 'use client', NO next/* imports below here
      db.ts                 Prisma client singleton
      money.ts              Decimal helpers
      log.ts                structured logger
      auth/                 Firebase Admin, session cookies, role guards
      network/              placement strategy, closure-table maintenance
      commission/           the engine (pure, unit-tested)
      queue/                JobQueue interface + in-DB impl
      kv/                   KvStore interface + impls
      storage/              GCS signed-URL helpers
      crypto/               field-level encryption for Aadhaar/PAN/bank
    lib/                     client-safe utilities, shared Zod schemas
    actions/                'use server' entry points (thin — call src/server/*)
  worker/                    Cloud Run commission/payout worker (own entrypoint)
```

---

## 8. Security baseline (brief §4.3)

- Aadhaar / PAN / bank number **encrypted at rest at the application layer**
  (AES-256-GCM, key from Secret Manager) via `src/server/crypto/`. UI shows
  last 4 only. A keyed **blind index** (`HMAC-SHA256`) column enables
  duplicate-identity detection without decrypting.
- Zod validation on every server action and route handler.
- CSRF protection on mutations, strict CSP headers, rate limiting on auth and
  payout endpoints.
- Webhook signature verification + idempotency keys on all payment/payout calls;
  amounts always recomputed server-side.
- DPDP Act: explicit consent capture at KYC submission
  (`kyc_profiles.consent_accepted_at`), documented retention/deletion policy.
- `audit_logs` is append-only; every admin mutation writes `before`/`after`.

---

## 9. What is NOT done yet (tracked in BUILD-PLAN.md)

Live payment gateway, Cloud Tasks wiring, Redis, courier API, notification
delivery (SMS/WhatsApp/email), the worker deployment, CI/CD pipelines, and the
GCP project/Cloud SQL provisioning itself (needs the founder's billing account).
