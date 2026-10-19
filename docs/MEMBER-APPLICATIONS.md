# Member Applications — mandatory referral-registration gate

Adds a referral-registration pipeline on top of the existing membership stack
(`MemberProfile` / `joinNetwork` / `KycProfile`).

**The storefront is gated.** `JoinGate` (`src/components/join/join-gate.tsx`),
mounted in `src/app/(storefront)/layout.tsx`, shows a non-dismissible modal over
every storefront route until the visitor submits the registration form — no ✕,
no Esc, no click-outside, focus-trapped, body scroll locked. Once
`amaasop_registered` is set (by the submit action) it never shows again.

- **Exempt:** `/admin/*`, `/office/*`, `/member/*` (separate layouts, never mount
  the storefront layout) and `/join` (that page *is* the form).
- **Client-side only** — no `middleware.ts` change. `robots.txt`, `sitemap.xml`,
  `opengraph-image` and crawlers are unaffected; every real browser session is
  blocked. A true server-enforced block (middleware) is a deliberate follow-up
  if bot/no-JS bypass must also be closed — it costs crawlability, so it is not
  enabled by default.

## Flow

1. A member shares `https://amaasop.com/join?ref=<mobile or AMA-code>`.
   `?ref=` accepts **either** a 10-digit mobile number **or** an `AMA-XXXXXX`
   member code (`src/server/referral/resolve.ts`). `JoinGate` also persists an
   inbound `?ref=` into the `amaasop_ref` cookie (30 d) before it gates.
2. The gate (or the `/join` page) resolves the sponsor and renders
   `RegistrationForm`. Fields follow the FRD order; the referrer field is locked
   when it came from a valid link.
3. `submitMemberApplicationAction` (`src/actions/join.ts`): zod-validate →
   per-IP rate limit → **CAPTCHA** (`src/server/captcha.ts`) → resolve sponsor →
   phone-uniqueness (blind-indexed `phoneHash`) → create a `MemberApplication`
   row (`status = PENDING`, consent timestamp + IP + UA) → set
   `amaasop_registered=1` cookie → audit log. The gate lifts; the visitor can
   now use the store while KYC is pending.
5. Admin reviews at **`/admin/applications`** (capability `application.review`,
   in the Network nav group). Approve / Hold / Reject with remarks.
   **Approve** calls `provisionMemberFromApplication`
   (`src/server/network/admin-create.ts`): creates the Firebase account (keyed by
   phone, + email when supplied), `joinNetwork` under the sponsor, seeds a
   `KycProfile` (`SUBMITTED`, carrying the ID-proof last-4 + DPDP consent time),
   and links the application to the new member. Rolls back a fresh Firebase user
   on failure.

## Admin "Add a distributor" (minimal)

An operator can register a distributor directly at **`/admin/members/new`**
("Add a distributor", capability `member.create`). The form is deliberately
small — **referrer (mobile or AMA code) + full name + mobile + optional email**.
Everything else (address, ID proof, nominee, KYC docs) is collected from the
distributor later, exactly like a public sign-up.

`createDistributorAction` → `adminEnrollDistributor`
(`src/server/network/enroll.ts`):

1. resolve the sponsor from a mobile number **or** an `AMA-XXXXXX` code
   (`resolveReferrer`, same as the funnel);
2. dedupe the mobile against existing distributors and the pending `/join`
   queue;
3. `provisionMemberFromApplication({ …, seedKyc: false })` — the shared
   account-creation + genealogy-placement + referral-code path, but **no**
   `MemberApplication` row and KYC left at `NOT_SUBMITTED`.

Audit-logged as `member.create` (`source: "ADMIN"`). `MemberApplication` is the
public funnel's table only; admin-added distributors just appear in
`/admin/members`.

## Delete a distributor

Row-level **Delete** on `/admin/members` (and on the member's page), capability
**`member.delete`** — not in any role's default set, so Super Admin only unless
granted per-user. One click + a confirm. `deleteDistributorAction` →
`deleteDistributor` (`src/server/network/delete.ts`) allows it **only** when
`getDistributorDeletability` reports zero downline and zero financial/store
history (commission entries, trust-fund entries, orders, wallet transactions,
withdrawals) — i.e. a mistaken enrolment. Anything else is refused with a
message pointing to **Terminate** (which keeps the record and compresses the
tree). On delete: the `MemberProfile` is removed (closure + family rows
cascade); a linked application is deleted (admin source) or returned to the
pending queue (public source); the login account is deleted too when it has no
separate customer activity, otherwise downgraded to a plain customer. No schema
change.

## Deliberate decisions

- **No OTP.** Founder's call. The mobile number is **unverified** until admin
  KYC — the review UI says so. The only bot shield on the form is Cloudflare
  Turnstile plus the phone-uniqueness check.
- **No raw Aadhaar.** Only `idProofLast4` is stored (Aadhaar Act §29 / DPDP),
  consistent with `KycProfile`. Full documents are collected later in the
  existing KYC flow.
- **Leads are not members.** A `MemberApplication` holds no login and is not in
  the genealogy. Only an APPROVED application is provisioned, so admin-created,
  self-joined, and funnel members are identical afterwards.
- **Nominee** name is captured on the application and shown to KYC staff — it is
  not auto-written to `FamilyMember` (the schema has no NOMINEE relation).

## Genealogy export (FRD §3.2)

`/admin/network` gains an **Export genealogy (CSV)** button per member
(`exportDownlineCsvAction` in `src/actions/network.ts`, capability
`network.view`).

## Config

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (see
`.env.local.example`). Both blank ⇒ CAPTCHA skipped (dev/CI).

## Deploying the schema change

Two migrations, both touching **only** `member_applications`:

- `20260907000000_member_applications` — creates the table +
  `MemberApplicationStatus` enum.
- `20260910120000_member_application_source` — adds the
  `MemberApplicationSource` enum + `source` (default `PUBLIC`) +
  `createdByUserId` columns + a `source` index (for admin-entered enrollments).

Apply to prod during release:

```
npm run db:setup        # runs `prisma migrate deploy` (+ seed) with .env.local
# or, standalone:
dotenv -e .env.local -- prisma migrate deploy
```
