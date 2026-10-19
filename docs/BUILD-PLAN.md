# Build Plan & Status

Phases follow the founder's brief §7. Status: ☐ not started · ◐ in progress · ☑ done

## Phase 0 — Design system
- ☑ Tailwind token system — "Herbal green + cream" palette (light + dark),
  Inter + Fraunces (serif headings), elevation tokens, tabular-nums for money
  (`globals.css`, `tailwind.config.ts`)
- ☑ Primitives added: Label, Progress (+ existing Button/Card/Input/Badge/Separator)
- ☑ Patterns: PageHeader, EmptyState, StatCard, MoneyAmount, SetupNotice
- ☐ Remaining primitives: Table/DataTable, Dialog, Tabs, Select, Toast, Skeleton
- ☐ Patterns: ErrorState, Stepper, LedgerRow, MaskedValue
- ☐ `/admin/_design` gallery route (noindex) for visual QA

## Phase 1 — Foundation
- ☑ Architecture decision record (`docs/ARCHITECTURE.md`)
- ☑ Commission-plan config register (`docs/COMMISSION-PLAN.md`)
- ☑ Prisma schema (`prisma/schema.prisma`) — full data model, `prisma generate` clean
- ☑ Dependencies installed
- ☑ Firebase Auth: client SDK, Admin SDK, session-cookie login/logout
  (`/api/auth/session`), role + MFA guards (`requireUser/Role/Member/Admin`)
- ☑ `src/server/*` core: `db.ts`, `money.ts`, `log.ts`, `env.ts`
- ☑ Seed: categories, primary site, initial `CommissionRuleSet` (`prisma/seed.ts`)
- ☑ `.env.local.example` updated
- ☐ `crypto/` (field encryption), `kv/`, `queue/`, `storage/` modules
- ☐ First migration (needs a live Postgres URL)
- ☐ `git init`, conventional-commit setup, CI skeleton

### TRANSITIONAL DECISION (2026-08-28)
The public storefront stays on **Supabase auth + Supabase data reads** for now.
The `(member)` portal and `/admin` panel are built on the **new Firebase + Cloud
SQL stack**. Both coexist until Phase 2 cuts the storefront over and deletes
Supabase. `middleware.ts` runs Supabase session refresh for storefront routes
only; `/member` + `/admin` gate server-side in their layouts.

## Phase 2 — Storefront migration (off Supabase)
- ☐ Port `src/lib/data/*` reads to Prisma
- ☐ Port `src/actions/*` (auth, cart, checkout, contact, newsletter, search)
- ☐ Firebase Auth on storefront sign-in/up/out
- ☐ GST-compliant invoicing (CGST/SGST intra-state, IGST inter-state from
  shipping state), invoice PDF to GCS
- ☐ Checkout stock reservation with row-level locking
- ☐ Member wallet as a checkout payment option

## Phase 3 — Membership & Genealogy  ← current milestone
- ☑ Prisma: `MemberProfile`, `NetworkClosure`, referral codes
- ☑ `PlacementStrategy` interface + `UnilevelPlacement` (`src/server/network/placement.ts`)
- ☑ `joinNetwork()` transaction — referral code → sponsor resolve → closure
  insert in one indexed write; self-sponsor + referral-loop + double-join guards
  (`src/server/network/genealogy.ts`)
- ☑ Genealogy read queries: upline chain, per-level summary, tap-to-expand
  level page, member-search lineage path, network totals
- ☑ `joinNetworkAction` server action + `/member/join` form (referral prefill
  from `?ref=`)
- ☑ Referral link + QR generation (`ReferralShare`, client-side QR)
- ☑ `(member)` route group + shell (`MemberNav`, plain-language labels,
  preview-mode fallback so `npm run dev` renders without a backend)
- ☑ Member dashboard: 3 above-the-fold answers, plain-sentence activity feed
- ☑ Genealogy summary view UI: per-level counts + earnings, tap-to-expand
- ☑ First-run explainer using the plan's real numbers (`PlanExplainer`)
- ☑ Instructional empty state with referral link/QR inline
- ☑ Referral-registration gate: mandatory non-dismissible `JoinGate` modal over
  the storefront (admin/office/member exempt) + `/join` page, `?ref=` accepts
  mobile OR AMA-code, CAPTCHA (no OTP), `MemberApplication` lead table,
  `/admin/applications` review → `provisionMemberFromApplication`, genealogy CSV
  export (`docs/MEMBER-APPLICATIONS.md`)
- ☐ Member search → lineage path UI (query exists, no UI yet)
- ☐ Wire explainer numbers to the live CommissionRuleSet (currently a constant)
- ☐ `/member/{wallet,orders,kyc}` are honest "coming soon" stubs

## Phase 4 — Commission engine
- ☐ `src/server/commission/` pure module + exhaustive unit tests
  (every tier, breakage, clawback, idempotency, partial depth)
- ☐ `domain_events` + `commission_jobs` queue tables + in-DB `JobQueue`
- ☐ `MEMBER_JOINED` → level income fan-out
- ☐ `REPURCHASE_CONFIRMED` → repurchase commission (gated on founder confirm)
- ☐ `ORDER_CANCELLED` → clawback against unsettled balance first
- ☐ Wallet + `wallet_transactions` + `trust_fund_ledger`

## Phase 5 — KYC & payouts
- ☐ Resumable multi-step KYC (Personal → Family/Nominee → Bank → Documents)
- ☐ GCS upload via signed URL, field encryption, masked display
- ☐ Admin KYC review queue + duplicate Aadhaar/PAN fuzzy match
- ☐ Payout batch generate → lock → CSV export → mark processed → reconcile
- ☐ TDS computation on payouts

## Phase 6 — Admin panel
- ☐ Hardened `/admin` session + mandatory TOTP + audit logging
- ☐ Inventory & dispatch, low-stock alerts, stock ledger per SKU per warehouse
- ☐ Income & tax reports (yearly + on-demand, Excel/PDF)
- ☐ Commission-rule console (versioned, effective-dated, before/after diff)
- ☐ Multi-site comparison + stock allocation/transfer ledger
- ☐ CMS-lite: banners, announcements

## Phase 7 — Notifications, hardening, launch
- ☐ SMS/WhatsApp/email delivery (order lifecycle, KYC, commission, new downline)
- ☐ CSP, rate limits, load test the depth-20 fan-out
- ☐ Cloud SQL backups + PITR, GCS bucket versioning
- ☐ Runbook: payout-batch failure recovery; admin user guide
- ☐ Cloud Tasks swap-in for the in-DB queue; worker deploy; CI/CD staging→prod

---

## Needs the founder / external input to proceed
- GCP project + billing, Cloud SQL instance, Firebase project credentials
- The `[CONFIRM]` list in `COMMISSION-PLAN.md`
- Razorpay/Cashfree account (Phase 4+ real money)
- CA guidance on TDS; legal sign-off on the comp plan
- Courier/logistics API choice
- SMS/WhatsApp provider (e.g. MSG91, Gupshup) choice
