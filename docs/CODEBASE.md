# AmaaShop — Codebase, Frontend & Backend Structure

_Last updated: 2026-08-30._

A single-page engineering reference for the AmaaShop platform: how the repository
is laid out, what runs on the client, what runs on the server, how data flows,
and where each concern lives. For **why** the foundational decisions were made,
see [`ARCHITECTURE.md`](./ARCHITECTURE.md); for build status see
[`BUILD-PLAN.md`](./BUILD-PLAN.md); for the compensation plan see
[`COMMISSION-PLAN.md`](./COMMISSION-PLAN.md).

---

## 1. System overview

AmaaShop is one Next.js 15 application serving **four product surfaces** from one
codebase and one identity system:

| Surface | Route prefix | Audience | Auth |
|---|---|---|---|
| **Storefront** | `/` (route group `(storefront)`) | Public consumers | Supabase (transitional) → Firebase |
| **Member portal** | `/member` (route group `(member)`) | MLM distributors — onboarding view | Firebase session + `MemberProfile` |
| **Distributor back-office** | `/office` (route groups `(office)`, `(office-auth)`) | Active MLM members | Firebase session + `MemberProfile` |
| **Admin console** | `/admin` | Staff / operators | Firebase session + RBAC + (planned) TOTP |

Supporting services:

- **Cloud SQL (PostgreSQL 16)** — relational core, accessed through Prisma.
- **Firebase Authentication (Identity Platform)** — single identity pool; roles
  as custom claims; IdP blocking functions in [`functions/`](../functions).
- **Google Cloud Storage** — product media (public bucket) and, when enabled,
  KYC documents (private bucket).
- **Commission worker** _(planned)_ — a separate Cloud Run service that imports
  the same Prisma schema and `src/server/**` modules with no Next.js coupling.

### Runtime topology (production)

```
                       ┌─────────────────────────────┐
   Browser ───────────▶│  Firebase App Hosting        │
                       │  (Cloud Run) — Next.js 15 SSR │
                       │  amaashop-backend, us-central1│
                       └──────────┬──────────┬─────────┘
                                  │          │
                 Cloud SQL Node.js│          │ Firebase Admin SDK
                 connector (TLS)  │          │ (verify session cookie)
                                  ▼          ▼
                      ┌───────────────┐  ┌──────────────────────┐
                      │  Cloud SQL PG │  │ Firebase Auth / GCIP  │
                      │  amaashop-pg  │  │ + blocking functions  │
                      └───────────────┘  └──────────────────────┘
                                  ▲
                          Google Cloud Storage
                       (amaashop-80cfd-media, …-kyc)
```

---

## 2. Technology stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15** (App Router), **React 19**, TypeScript `strict` + `noUncheckedIndexedAccess` | Server-first: RSC + Server Actions. |
| Styling | **Tailwind CSS 3** + design tokens, shadcn/ui-style primitives | Tokens in `tailwind.config.ts` + `src/app/globals.css`. `darkMode: class`. |
| Fonts | **Inter** (sans) + **Fraunces** (serif headings) via `next/font/google` | CSS vars `--font-inter`, `--font-fraunces`. |
| Icons | **lucide-react** | `optimizePackageImports` enabled. |
| ORM / DB | **Prisma 6** → **PostgreSQL** (Cloud SQL in prod, embedded/local in dev) | Single schema `prisma/schema.prisma`, mapped to Postgres schema `amaashop`. |
| Auth | **Firebase Auth** (client SDK + Admin SDK), session cookies | Supabase SSR still used by the storefront during migration. |
| Validation | **Zod 3** | Every Server Action and route handler input. |
| Money | **decimal.js** (via Prisma `Decimal`) | `Decimal(14,2)` rupees everywhere; never `number`. |
| Media | **sharp** (image processing), `@google-cloud/storage` | |
| DB connectivity (prod) | `@google-cloud/cloud-sql-connector` + `@prisma/adapter-pg` | App Hosting has no VPC/socket; connector tunnels over TLS. |
| Testing | **Vitest** | `npm test`. |
| Hosting | **Firebase App Hosting** (Cloud Run) | Config in `apphosting.yaml`. |
| Secrets | **Google Secret Manager** | 7 secrets wired via `apphosting.yaml`. |

---

## 3. Repository layout

```
Amaashop/
└── nextjs-app/                 ← the application (App Hosting `rootDirectory`)
    ├── apphosting.yaml         Firebase App Hosting run config + env + secret bindings
    ├── firebase.json           Functions deploy config
    ├── .firebaserc             Project alias → amaashop-80cfd
    ├── next.config.ts          image remote patterns, experimental flags
    ├── tailwind.config.ts      design tokens (colors, radius, fonts, shadows, keyframes)
    ├── tsconfig.json           strict; path alias @/* → src/*; excludes functions/
    ├── postcss.config.js
    ├── package.json            scripts + deps (ESM, Node 20)
    │
    ├── prisma/
    │   ├── schema.prisma       ← single data model (see §6)
    │   ├── migrations/         20260828075402_init, …_product_catalog_pro, …_affiliate_links
    │   └── seed.ts             categories, primary Site, initial CommissionRuleSet
    │
    ├── functions/              ← SEPARATE codebase (own package.json/tsconfig)
    │   └── src/index.ts        Identity Platform blocking triggers (Super Admin invariant)
    │
    ├── scripts/                one-off operational scripts (tsx / node)
    │   ├── dev-db.mjs          embedded-postgres for local dev
    │   ├── create-super-admin.ts     npm run admin:create
    │   ├── seed-catalog.ts           npm run catalog:seed  (16 cats + 35 products)
    │   ├── seed-distributor.ts       npm run office:seed    (MLM tree root + downline)
    │   └── verify-*.mjs              auth / genealogy / node-move smoke checks
    │
    ├── docs/                   ARCHITECTURE, BUILD-PLAN, COMMISSION-PLAN, SETUP,
    │                           SUPER-ADMIN, CODEBASE (this file)
    ├── public/                 static assets (placeholder-product.svg)
    │
    └── src/
        ├── middleware.ts       Edge: cheap auth pre-filter for /admin & /office;
        │                       Supabase session refresh for the storefront
        ├── app/                ← routes (see §4)
        ├── components/         ← UI, client + server components (see §5)
        ├── store/              client context providers (cart, wishlist, currency, toast)
        ├── hooks/              (reserved)
        ├── lib/                client-safe utilities + storefront data adapters (see §5.4)
        ├── actions/            'use server' entry points — thin, call src/server/** (see §5.5)
        └── server/             server-only domain logic — NO 'use client', NO next/* (see §6)
```

### Path alias

`@/*` → `src/*` (declared in `tsconfig.json`). Import server code as
`@/server/...`, client utilities as `@/lib/...`, actions as `@/actions/...`.

### The `functions/` boundary

`functions/` is its own npm project and is **excluded from the app's
`tsconfig.json`**. It only holds the two Identity Platform blocking functions.
Deploy with `npm run functions:deploy`.

---

## 4. Frontend — routing & rendering

All routes live under `src/app/` using the App Router. Route **groups** in
parentheses share a layout without adding a URL segment.

### 4.1 Route map

| Group / path | Key routes | Rendering |
|---|---|---|
| **`(storefront)`** | `/`, `/shop`, `/search`, `/product/[slug]`, `/cart`, `/checkout`, `/wishlist`, `/account`, `/account/orders`, `/orders/[orderId]`, `/track-order`, `/about`, `/contact`, `/signin`, `/signup`, legal pages | Mostly Server Components; DB-backed routes are `force-dynamic` (no DB at build). PDP emits full SEO metadata + JSON-LD. |
| **`(member)`** | `/member`, `/member/join`, `/member/network`, `/member/wallet`, `/member/orders`, `/member/kyc`, `/member/explainer` | Server Components behind `requireMemberPage()`. Preview data when no live profile. |
| **`(office)`** | `/office` (dashboard), `/office/team`, `/office/income`, `/office/wallet`, `/office/withdrawals`, `/office/referrals`, `/office/rank`, `/office/kyc`, `/office/profile`; stubs: `/office/orders`, `/office/downloads`, `/office/support` | Guarded shell via `getOfficeContext()`. Teal/slate visual identity. |
| **`(office-auth)`** | `/office/login`, `/office/forgot`, `/office/join` | No shell; redirect out if already signed in. |
| **`/admin`** | `/admin` (metrics), `/admin/catalog` (+ `/new`, `/[id]`), `/admin/members` (+ `/[id]`), `/admin/network`, `/admin/commission`, `/admin/runs`, `/admin/payouts`, `/admin/withdrawals`, `/admin/kyc`, `/admin/orders`, `/admin/autoship`, `/admin/users`, `/admin/audit`, `/admin/settings`; public: `/admin/signin`, `/admin/no-access`, `/admin/verify` | Own `layout.tsx` + per-page guard `requireAdminPage()` / `requireCapabilityPage(cap)`. |
| **`/api`** | `POST\|DELETE /api/auth/session`, `GET /api/compare-price`, `GET /api/out` | Route handlers, `runtime = "nodejs"` where `firebase-admin` is needed. |

### 4.2 Root & shared UI

- [`src/app/layout.tsx`](../src/app/layout.tsx) — `<html>`/`<body>`, font
  variables, global metadata (`metadataBase`, title template, OpenGraph,
  robots), `organizationSchema()` JSON-LD, Firebase Analytics loader.
- [`src/app/globals.css`](../src/app/globals.css) — Tailwind layers + CSS custom
  properties for the light/dark token palette.
- `manifest.ts`, `robots.ts`, `sitemap.ts` — generated at the app root;
  `sitemap.ts` is `force-dynamic` (reads live product slugs).
- `(storefront)/loading.tsx`, `error.tsx`, `not-found.tsx` — segment-level
  fallbacks.

### 4.3 Client state (`src/store/`)

React context providers composed in `providers.tsx`:

| Provider | Responsibility | Persistence |
|---|---|---|
| `cart-provider.tsx` | cart line items, quantities, totals | `amaashop_cart` cookie |
| `wishlist-provider.tsx` | saved products | `amaashop_wishlist` cookie |
| `currency-provider.tsx` | display currency switch | client only |
| `toast-provider.tsx` | transient notifications | in-memory |

These are the only stateful client stores; everything else is server-rendered
and refreshed via `revalidateTag` / `revalidatePath` after mutations.

### 4.4 Component organisation (`src/components/`)

- **`ui/`** — design-system primitives: `button`, `card`, `input`, `label`,
  `badge`, `progress`, `separator`, `table` (class-variance-authority + `cn`).
- **`patterns/`** — composed building blocks: `page-header`, `empty-state`,
  `stat-card`, `money-amount`, `setup-notice`.
- **Feature folders** — `home/`, `product/`, `shop/`, `search/`, `cart/`,
  `checkout/`, `wishlist/`, `account/`, `orders/`, `layout/` (header, nav,
  footer, mobile bottom nav), `about/`, `contact/`, `seo/` (`json-ld`),
  `skeletons/`.
- **Portal-specific** — `admin/` (+ `admin/catalog/` product form, table,
  filters, SEO preview), `office/` (nav, login/forgot forms, withdrawal form,
  user menu), `member/` (join form, network levels, referral share, plan
  explainer), `auth/`.

Client components are marked `'use client'` and kept as leaf "islands"
(`quick-add`, `wishlist-toggle-button`, `purchase-controls`, `pincode-checker`,
`currency-switcher`, …). Data fetching stays in the enclosing Server Component.

### 4.5 SEO

- Per-route `generateMetadata` (PDP: custom absolute title, canonical, OG image,
  optional `noindex`).
- `runSeoChecks` / `seoScore` / `productJsonLd` in `src/lib/catalog/seo.ts` power
  the live Google-SERP preview and on-page score in the admin product form.
- `src/lib/seo/schema.ts` — `organizationSchema()` and related JSON-LD builders.
- `components/seo/json-ld.tsx` — `<script type="application/ld+json">` renderer.

---

## 5. Frontend ↔ backend bridge

### 5.1 Rendering model

1. **Server Components** call `src/server/**` (or storefront adapters in
   `src/lib/data/**`) directly — no API round-trip.
2. **Server Actions** (`src/actions/**`, `'use server'`) handle mutations from
   forms and client islands. They are thin: validate with Zod → call
   `src/server/**` → `writeAudit` (admin) → `revalidateTag`/`revalidatePath`.
3. **Route handlers** (`src/app/api/**`) exist only where a non-action HTTP
   endpoint is required (session-cookie exchange, price-compare JSON, outbound
   affiliate redirect).

### 5.2 Caching

- Public catalog reads in `src/server/catalog/public.ts` are wrapped in
  `unstable_cache` tagged `"products"`. Admin write actions call
  `revalidateTag("products")`.
- A raw DB seed does **not** bust `unstable_cache` — restart the server or clear
  `.next/cache` after `npm run catalog:seed`.
- DB-backed storefront routes (`/`, `/shop`, `/search`, `sitemap.ts`) are
  `export const dynamic = "force-dynamic"` because the App Hosting build step has
  no database.

### 5.3 API route handlers

| Handler | Method | Purpose |
|---|---|---|
| `api/auth/session/route.ts` | `POST` | Exchange a Firebase ID token for an HTTP-only session cookie. `scope:"admin"` enforces verified e-mail + admin-role/allow-list, rate-limited per IP. `DELETE` clears the cookie and revokes refresh tokens. |
| `api/compare-price/route.ts` | `GET` | Live competitor price comparison for a product/variant (lazy cache, 24 h TTL). |
| `api/out/route.ts` | `GET` | Outbound affiliate redirect; prefers an ops-curated `AffiliateLink` over a scraped `sourceUrl`; increments click count. |

### 5.4 Storefront data adapters (`src/lib/data/`)

`products.ts`, `categories.ts`, `orders.ts` — `server-only` modules that keep the
**legacy `Product`/`Category` shapes** used by storefront components while
delegating to the new Prisma read layer (`src/server/catalog/public.ts`). This
let the Supabase→Cloud SQL cutover happen without touching components.

### 5.5 Server Actions (`src/actions/`)

| File | Actions (selected) |
|---|---|
| `auth.ts` | `signInAction`, `signUpAction`, `signOutAction` |
| `admin.ts` | `setUserRoleAction`, `setUserStatusAction`, `setUserCapabilitiesAction`, `setMfaClaimAction`, `createCommissionRuleVersionAction`, `approveKycAction`/`rejectKycAction`, `moveMemberAction`, `setMemberFrozenAction`, `terminateMemberAction`, `start/stopImpersonationAction`, `sendPasswordResetAction` |
| `catalog.ts` | `createProductAction`, `updateProductAction`, `setProductStatusAction`, `duplicateProductAction`, `uploadProductImageAction`, `setAffiliateLinksAction` |
| `checkout.ts` | `placeOrderAction` (Zod `checkoutSchema`) |
| `network.ts` | `joinNetworkAction`, `loadDownlineLevelAction` |
| `office.ts` | `requestWithdrawalAction` |
| `search.ts` | `getSearchSuggestions`, `getSearchResults` |
| `contact.ts`, `newsletter.ts` | `submitContactAction`, `subscribeNewsletterAction` |

Every admin action re-derives the caller via a server guard, checks a capability,
and writes an `AuditLog` row before returning a discriminated-union result
(`{ ok: true } | { ok: false, error }`).

---

## 6. Backend — `src/server/`

Server-only domain layer. **No `'use client'`, no `next/*` imports** below this
directory (so the future Cloud Run worker can import it verbatim).

### 6.1 Core primitives

| Module | Responsibility |
|---|---|
| `db.ts` | Prisma client singleton. Detects a socket-form `DATABASE_URL` (`host=/cloudsql/…`) and connects via the **Cloud SQL Node.js connector + `@prisma/adapter-pg`** (schema passed as `new PrismaPg(cfg, { schema })`); otherwise a plain `PrismaClient` over TCP for local dev. |
| `money.ts` | `Decimal`-based money helpers: `add`, `sub`, `mul`, `applyBps`, `allocate` (remainder-safe split), `gte`, `formatINR`. **All money arithmetic goes through here.** |
| `env.ts` | Typed, validated environment accessor. |
| `log.ts` | Structured JSON logger (`log.info/warn/error`) → Cloud Logging in prod. |
| `config.ts` | `backendStatus()` — reports which required env vars are missing (drives `SetupNotice`). |
| `audit.ts` | `writeAudit({ action, entity, entityId, before, after, ip, userAgent })` → append-only `audit_logs`. |
| `rate-limit.ts` | In-memory fixed-window `rateLimit(key, limit, windowMs)` + `clientIp(req)`. Interface-shaped for a Redis/Memorystore swap. |
| `rbac.ts` | Capability catalogue + role→capability mapping + `effectiveCapabilities` / `can` / `canAny` (see §7). |

### 6.2 Auth (`src/server/auth/`)

| Module | Responsibility |
|---|---|
| `admin.ts` | Lazily initialises `firebase-admin` (`firebaseAdmin()`, `adminAuth()`); `usingAuthEmulator()`. |
| `session.ts` | Session-cookie lifecycle: `createSessionCookie`, `inspectIdToken`, `verifySession` (React `cache`d), `clearSession`; `getCurrentUser` (claims + `AppUser` row); `syncAppUser` (mirror Firebase user → `app_users`, auto-promote allow-listed Super Admin); `setUserRole`, `setMfaClaim`; impersonation `beginImpersonation`/`endImpersonation`. |
| `guards.ts` | Composable gates. Non-`Page` variants throw; `*Page` variants `redirect()`. `requireUser`, `requireRole`, `requireMember`, `requireAdmin`, `requireCapability(cap)` + `requireUserPage`, `requireMemberPage`, `requireAdminPage`, `requireCapabilityPage`. |
| `super-admin.ts` | `SUPER_ADMIN_ALLOWLIST` parsing: `superAdminAllowlist()`, `isAllowlistedSuperAdminEmail()`, `superAdminAllowlistIsEmpty()`. |

### 6.3 Catalog (`src/server/catalog/`)

- `products.ts` — admin CRUD: `listProducts` (URL-driven search/filter/sort/
  paginate), `getCatalogFormData`, `getProductForEdit`, `createProduct`,
  `updateProduct`, `setProductStatus`, `duplicateProduct` (+ stock-ledger seed on
  opening stock).
- `public.ts` — storefront reads, **`ACTIVE`-only**, all `unstable_cache`d and
  tagged `"products"`: `getActiveProducts`, `getProductsByFlag`,
  `getProductsByCategorySlug`, `getRelatedProductsPublic`, `getActiveProductSlugs`,
  `getProductDetailBySlug` (rich: all SEO fields + gallery), `searchProductsPublic`,
  `getProductForCartPublic`, `getStorefrontCategories`.
- `slug.ts` — `uniqueProductSlug`, `uniqueProductSku` (collision-safe).

### 6.4 Network / genealogy (`src/server/network/`)

- `placement.ts` — `PlacementStrategy` interface; `UnilevelPlacement` is the only
  implementation; `getPlacementStrategy()` factory. Binary/matrix can be added
  without a schema change.
- `genealogy.ts` — `joinNetwork()` (transactional: create `MemberProfile`, insert
  closure rows, loop/self-referral guard), `getUplineChain`,
  `getDownlineLevelSummary`, `getDownlineAtLevel`, `getLineagePath`,
  `getNetworkTotals`. `MAX_COMMISSION_DEPTH = 20`.
- `move.ts` — admin ops (2FA + audit): `moveMemberSubtree`, `terminateAndCompress`
  (downline compresses upward), `setMemberFrozen`.
- `member-code.ts` — `generateMemberCode()` (e.g. `AMA-8F3K2Q`),
  `normalizeMemberCode()`.

The genealogy uses a **transitive-closure table** `network_closure(ancestor_id,
descendant_id, depth)` including self at `depth = 0`, so "all uplines up to 20"
and "entire downline" are single indexed queries — no recursive walk.

### 6.5 Member & office (`src/server/member/`, `src/server/office/`)

- `member/context.ts` — `getMemberContext()` (signed-in + profile or preview).
- `member/overview.ts` — `getMemberDashboard`, `getNetworkSummary` view-models.
- `member/preview-data.ts` — static `PREVIEW_DASHBOARD` / `PREVIEW_NETWORK` for
  the pre-join experience.
- `office/context.ts` — `getOfficeContext()` (signed-in + `memberProfile` else
  redirect to `/office/login` or `/office/join`); `redirectIfSignedIn()`.
- `office/data.ts` — read view-models: `getWalletView`, `getIncomeView`
  (by `CommissionType`), `getWithdrawalsView`, `getKycView`, `getRankProgress`
  (5-tier ladder from team size).
- Payout maths — `src/lib/office/payout.ts` (`computePayout`, `withdrawalError`,
  `PAYOUT_RULES`): pure, shared client + server. Live TDS s.194H (5 % with PAN /
  20 % without) + fee + KYC gate.

### 6.6 Admin support (`src/server/admin/`)

`context.ts` (`adminGuard`, `adminGuardCap`), `members.ts` (`listMembers`,
`getMemberDetail`), `metrics.ts` (`getAdminMetrics` for the dashboard).

### 6.7 Pricing (`src/server/pricing/`)

- `scraper-client.ts` — `fetchCompetitorPrices()` against an external scraping API
  (timeout from `SCRAPER_API_TIMEOUT_MS`).
- `competitor-cache.ts` — lazy cache with `isStale()` (TTL
  `COMPETITOR_PRICE_TTL_HOURS`, default 24) + comparison view-models.
- `affiliate.ts` — `listAffiliateLinks`, `resolveOutbound` (curated link wins
  over scraped URL).

### 6.8 Storage (`src/server/storage/`)

`product-images.ts` — `uploadProductImage()` streams to GCS bucket
`GCS_BUCKET_MEDIA` (`amaashop-80cfd-media`), public-read objects served from
`storage.googleapis.com`. KYC uploads target a separate private bucket
(`GCS_BUCKET_KYC`) when configured.

---

## 7. Identity, roles & access control

### 7.1 Model

- **`AppUser.id` is the Firebase UID.** The row is created on first authenticated
  request by `syncAppUser`.
- Role is a Firebase **custom claim** (`role`) mirrored onto `AppUser.role`.
  `mfa` is a second claim.
- **Capabilities** (`src/server/rbac.ts`): every protected admin operation maps to
  a capability string (`catalog.write`, `commission.run.release`,
  `withdrawal.review`, `users.manage`, `audit.view`, …). Effective set =
  `role defaults + AppUser.extraCapabilities − AppUser.deniedCapabilities`. This
  is how the Super Admin builds "custom restricted sub-roles" with no code
  change.

| Role | Capability set |
|---|---|
| `SUPER_ADMIN` | `*` — **only** when the account e-mail is on `SUPER_ADMIN_ALLOWLIST`; otherwise resolves to ∅ (fail-closed) |
| `OPS_ADMIN` | network view/move/freeze, member view, KYC review, commission view, order view |
| `FINANCE_ADMIN` | commission view/preview/release, wallet adjust, withdrawal review, payout process, tax view |
| `STORE_MANAGER` | catalog + inventory + autoship + order view |
| `SUPPORT_COMPLIANCE` | member view, password reset, KYC review, order view/track, network view |
| `MEMBER` / `CONSUMER` | none (storefront / portal only) |

### 7.2 Super Admin — defence in depth

1. **Edge middleware** (`src/middleware.ts`) — no session cookie ⇒ `302
   /admin/signin` (presence check only; cannot verify on Edge).
2. **Session route** (`api/auth/session`, `scope:"admin"`) — verified e-mail
   required, must be allow-listed Super Admin **or** an existing admin role, per
   IP rate-limited; otherwise `403` and no cookie / no `app_users` row.
3. **Server guards** (`requireAdminPage` / `requireCapabilityPage`) on every
   admin page and action — the authoritative check.
4. **`effectiveCapabilities`** — a `SUPER_ADMIN` row whose e-mail is not
   allow-listed gets ∅.
5. **IdP blocking functions** (`functions/src/index.ts`) —
   `enforcesuperadminonsignin` (beforeSignIn) and `enforcesuperadminoncreate`
   (beforeCreate) reconcile the `role` claim against the allow-list inside
   Google's auth pipeline, before a token is minted. **Fail-open** so a bug never
   blocks ordinary customer sign-in; the app-layer guards still fail-closed.

Provision: `npm run admin:create -- <email> [--password X | --send-reset]`
(idempotent, writes an audit row). Runbook: [`SUPER-ADMIN.md`](./SUPER-ADMIN.md).

---

## 8. Data model (`prisma/schema.prisma`)

One schema, shared by the app and the (planned) worker. Conventions: `cuid()`
IDs (except `AppUser.id` = Firebase UID); money is `Decimal(14,2)` rupees;
ledgers are **append-only** (reversals append a negative row); `*_enc` columns
hold AES-256-GCM ciphertext with `*_last4` / `*_hash` (keyed HMAC blind index) as
the only searchable projections.

| Domain | Models |
|---|---|
| **Identity & access** | `AppUser` (role, status, extra/denied capabilities) |
| **Membership & genealogy** | `MemberProfile` (sponsor, placement, status, freeze/terminate/move fields), `NetworkClosure` (ancestor/descendant/depth) |
| **KYC & family** | `KycProfile` (encrypted Aadhaar/PAN/bank + blind-index hashes, DPDP consent), `FamilyMember` (nominee shares) |
| **Catalog & inventory** | `Site`, `Category`, `Product` (status lifecycle, PV/BV MLM metrics, GST, SEO field set, ratings), `ProductImage` (ordered gallery), `Warehouse`, `InventoryItem`, `StockLedgerEntry` (append-only), `SiteStockTransfer` _(schema-only)_ |
| **Price comparison** | `ProductVariant` (pack sizes), `AffiliateLink` (curated outbound), `CompetitorPrice` (cached, 24 h TTL), `Retailer` enum (Amazon/Flipkart/JioMart) |
| **Orders, payments, GST** | `Order` (types: storefront/repurchase/joining), `OrderItem`, `Payment` (provider `SIMULATED`, idempotency key), `GstInvoice` (CGST/SGST vs IGST by place-of-supply) |
| **Commission config** | `CommissionRuleSet` (versioned `ruleJson`, effective window — payouts always computed against the rule set active at the source order's `confirmedAt`) |
| **Wallet & ledgers** | `Wallet` (`balanceCache` + `settledBalance`, both derived), `CommissionLedgerEntry` (immutable, `idempotencyKey = {orderId}:{type}:{beneficiaryId}:{level}`, reversal chain), `CommissionRun` (draft → previewed → released), `WithdrawalRequest`, `WalletTransaction`, `TrustFundLedgerEntry` (public transparency fund) |
| **Payouts** | `PayoutBatch` (lock token vs double-trigger), `PayoutItem` (gross/TDS/net) — simulated: CSV export + manual mark-processed |
| **Async queue** | `DomainEvent` (`MEMBER_JOINED`, `REPURCHASE_CONFIRMED`, `ORDER_CANCELLED`) + `CommissionJob` (retry + dead-letter). In-DB now; swappable for Cloud Tasks. |
| **Ops** | `Notification` (SMS/WhatsApp/email/in-app), `AuditLog` (append-only before/after), `ContentBlock` _(schema-only CMS-lite)_ |

### Commission engine (design — `src/server/commission/`, not yet built)

- Triggered by `MEMBER_JOINED` (level income to 20 upline generations) and
  `REPURCHASE_CONFIRMED`; `ORDER_CANCELLED` fires clawback.
- Idempotent (unique `idempotency_key` per ledger write), async (one
  `commission_jobs` row per upline payout), and rule-versioned (never rewrites
  history). Breakage policy ∈ `FORFEIT | ROLL_UP | ESCROW`.

---

## 9. Environment & configuration

### 9.1 Local development

```bash
npm install
npm run dev:db          # embedded Postgres (scripts/dev-db.mjs) → 127.0.0.1
npm run dev:emulators   # Firebase Auth emulator (needs Java)
npm run prisma:migrate  # apply migrations to the dev DB
npm run db:seed         # categories + primary Site + initial CommissionRuleSet
npm run catalog:seed    # 16 categories + 35 demo products (idempotent)
npm run dev             # Next.js dev server

# or all-in-one:
npm run dev:all         # concurrently: db + auth emulator + web
```

Config lives in `.env.local` (see `.env.local.example`). Full walkthrough:
[`SETUP.md`](./SETUP.md).

### 9.2 Production (Firebase App Hosting)

- Backend `amaashop-backend`, region **us-central1**, live branch `main`, app
  root `/nextjs-app`. Auto-rollout on push; manual:
  `firebase apphosting:rollouts:create amaashop-backend --git-branch main --force`.
- URL: `https://amaashop-backend--amaashop-80cfd.us-central1.hosted.app`.
- **`apphosting.yaml`** defines run config (1 vCPU / 1 GiB, `maxInstances: 10`,
  `concurrency: 80`), public `NEXT_PUBLIC_*` build vars, non-secret runtime vars,
  and 7 Secret Manager bindings: `DATABASE_URL`, `DIRECT_URL`,
  `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIELD_ENCRYPTION_KEY`, `BLIND_INDEX_KEY`,
  `WORKER_SHARED_SECRET`, `PRICE_COMPARE_REVALIDATE_SECRET`.
- `DATABASE_URL` is **RUNTIME-only** (socket form): the build step has no
  database, so nothing DB-backed may be prerendered.
- DB: Cloud SQL `amaashop-80cfd:us-central1:amaashop-pg` (POSTGRES_16), database
  `amaashop`, Postgres schema `amaashop`, app user `amaashop_app`. Connection via
  the Cloud SQL Node.js connector (compute SA holds `roles/cloudsql.client`).

**Schema changes now self-apply on deploy.** App Hosting auto-rolls out on every
push to `main` with no migration step of its own — a new Prisma model/column
used to go live in code before the prod table existed, which is exactly what
took `/admin` down on 2026-09-12 (`getAdminMetrics()` querying
`member_applications` before the table existed in prod). Fixed at the root:
[`src/instrumentation.ts`](../src/instrumentation.ts) calls
[`applyPendingMigrationsOnBoot`](../src/server/migrate.ts) once per instance
boot (nodejs runtime only), which applies any `prisma/migrations/*` not yet in
`_prisma_migrations` using the app's own runtime `DATABASE_URL` — same Cloud SQL
connector `db.ts` already uses, no separate credential fetch. Serialized across
concurrently-booting instances with a Postgres advisory lock; never throws (logs
and no-ops on failure so a migration hiccup can't take the whole app down). Only
activates when `DATABASE_URL` is Cloud SQL socket-form, so it's a no-op locally.
`npm run db:migrate:prod` ([scripts/migrate-prod.mjs](../scripts/migrate-prod.mjs))
still exists as a manual/local escape hatch (e.g. to apply a migration ahead of
a deploy, or diagnose from a dev machine) but is no longer required for a normal
release.

### 9.3 npm scripts (reference)

| Script | Purpose |
|---|---|
| `dev`, `dev:db`, `dev:emulators`, `dev:all` | local run |
| `build` | `prisma generate && next build` |
| `start` | `next start` |
| `lint`, `typecheck`, `test`, `test:watch` | quality gates |
| `prisma:generate`, `prisma:migrate`, `prisma:studio` | schema workflow |
| `db:seed`, `catalog:seed`, `office:seed`, `admin:create` | data / provisioning |
| `db:setup` | `prisma migrate deploy && db:seed` |
| `db:migrate:prod` | applies pending migrations to prod Cloud SQL directly via the connector (no proxy binary) — run on every schema-changing release |
| `functions:deploy` | deploy IdP blocking functions |
| `verify` | auth + genealogy smoke checks |

---

## 10. Security baseline

- **Field-level encryption** for Aadhaar / PAN / bank number (AES-256-GCM, key
  from Secret Manager); UI shows last 4 only; keyed **blind index**
  (`HMAC-SHA256`) enables duplicate-identity detection without decryption.
- **Zod** on every Server Action and route handler input.
- **Rate limiting** on auth and (planned) payout endpoints; per-IP fixed window.
- **Idempotency keys** on payments, payout items, and every commission ledger
  write; amounts always recomputed server-side.
- **DPDP Act** — explicit consent captured at KYC submission
  (`KycProfile.consentAcceptedAt`).
- **`audit_logs`** append-only; every admin mutation records `before`/`after`,
  IP, and user agent.
- Session cookies are HTTP-only, verified server-side via the Firebase Admin
  SDK; `DELETE /api/auth/session` revokes refresh tokens.

---

## 11. Known transitional state & open items

| Area | Status |
|---|---|
| Storefront auth | Still on **Supabase SSR** (`src/lib/supabase/*`, `middleware.ts` `updateSession`); data reads already cut over to Cloud SQL/Prisma. Migration to Firebase pending. |
| Payments | **Simulated** — full ledger + payout batch + CSV export, no live gateway. `PaymentProvider` interface ready for Razorpay/Cashfree. |
| Commission worker | Not deployed; engine modules (`src/server/commission/`) not yet built. |
| Async queue | In-DB (`DomainEvent` + `CommissionJob`); Cloud Tasks swap pending. |
| Cache / rate-limit | In-memory; Memorystore (Redis) pending. |
| Admin TOTP | Specified (mandatory on `/admin`), not yet enforced end-to-end. |
| Production DB | Schema-only, not seeded. |
| Secrets | Rotate the exposed `firebase-adminsdk` key; move to ADC over `FIREBASE_SERVICE_ACCOUNT_JSON`. |
| KYC bucket | `GCS_BUCKET_KYC` not yet provisioned — KYC upload paths will throw until it exists. |
| Custom domain | Not attached; `NEXT_PUBLIC_SITE_URL` points at the `hosted.app` URL. |

---

## 12. Quick reference — "where does X live?"

| Need to… | Go to |
|---|---|
| Add a storefront page | `src/app/(storefront)/<route>/page.tsx` |
| Add an admin page | `src/app/admin/<route>/page.tsx` + guard with `requireCapabilityPage(cap)` |
| Add a mutation | `src/actions/<domain>.ts` (`'use server'`) → `src/server/<domain>/…` |
| Change the data model | `prisma/schema.prisma` → `npm run prisma:migrate` |
| Add a capability | `CAPABILITIES` + role maps in `src/server/rbac.ts` |
| Touch money math | `src/server/money.ts` only |
| Add a design token | `tailwind.config.ts` + `src/app/globals.css` |
| Add a UI primitive | `src/components/ui/` |
| Product read for the storefront | `src/server/catalog/public.ts` (cached, `ACTIVE` only) |
| Product write for the admin | `src/server/catalog/products.ts` |
| Genealogy query | `src/server/network/genealogy.ts` |
| Firebase Admin / sessions | `src/server/auth/` |
| Deploy config | `apphosting.yaml` |
| Auth blocking rules | `functions/src/index.ts` |
```
