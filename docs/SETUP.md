# Local dev setup

One thing must be running: the **Firebase emulator suite** (Auth + Firestore).
Then seed, then `npm run dev`. There is no database to provision — Firestore
is schemaless and the app talks to it directly via `firebase-admin`.

## 1. Firebase emulators

Needs Java (already present). In a **separate terminal**:

```bash
npm run emulators
```

Leave it running. UI at http://127.0.0.1:4000 (view/create Auth users or
browse Firestore data manually if you want). No cloud Firebase project is
needed for local dev — the app and the seed talk to these emulators because
`.env.local` sets `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST`.

## 2. Seed

```bash
npm install                 # picks up dotenv-cli, firebase-tools, tsx
npm run db:seed             # reference data + dev accounts + demo network
npm run catalog:seed        # demo catalog (products, categories)
```

`db:seed` prints the sign-in credentials. Defaults:

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `ashokkumarmoharana05@gmail.com` | `Admin@12345` |
| Network Admin | `network@amaashop.local` | `Network@12345` |
| Finance / Payout Manager | `finance@amaashop.local` | `Finance@12345` |
| Catalog / Store Manager | `store@amaashop.local` | `Store@12345` |
| Support / Compliance | `support@amaashop.local` | `Support@12345` |
| Member (sponsor `AMA-ROOT01`) | `sponsor@amaashop.local` | `Sponsor@12345` |
| Members (downline) | `priya@ / ravi@ / anjali@ / sunil@ / deepa@ amaashop.local` | `Member@12345` |

Sign in at `/admin/signin` (admins) or `/signin` then visit `/member`
(distributors).

## 3. Run

```bash
npm run dev
```

Or `npm run dev:all` to start the emulators and the dev server together.

- Storefront: http://localhost:3000
- Member portal: http://localhost:3000/member (sign in as `sponsor@` first via
  http://localhost:3000/signin — member sign-in UI reuses the storefront one)
- Admin console: http://localhost:3000/admin (sign in as the Super Admin above)
- Distributor back-office: http://localhost:3000/office/login

## Running against the real Firebase project (amaashop-80cfd)

The real web config is already in `.env.local`. To use the real project instead
of the emulators:

1. **Firebase console → Authentication → Sign-in method**: enable
   **Email/Password** and **Google**.
2. **Project settings → Service accounts → Generate new private key**. Put the
   JSON (single line) into `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env.local`.
3. Comment out (or delete) the `FIREBASE_AUTH_EMULATOR_HOST`,
   `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`, and `FIRESTORE_EMULATOR_HOST`
   lines.
4. `npm run db:seed` again — it now provisions the reference data (and, if
   `SEED_DEMO=true`, demo accounts) in the real project. (Or just sign in once
   with `ashokkumarmoharana05@gmail.com` via Google — the
   `BOOTSTRAP_SUPER_ADMIN_EMAIL` mechanism promotes that first sign-in to
   SUPER_ADMIN automatically.)

No code changes — the SDK init switches on the presence of the emulator env
vars (`src/server/auth/admin.ts`, `src/server/firestore.ts`).

**Careful**: with the emulator vars removed, every script and `npm run dev`
talks to the *real* production Firestore/Auth. There's no separate "dev"
Firebase project for this app today — treat that combination as production
access.

## One-time production data migration

`scripts/migrate-to-firestore.ts` is a one-time tool that copied the old
Postgres (Prisma) + Supabase data into Firestore during the 2026-09 migration.
It's kept only for reference / a future re-run if ever needed — the running
app no longer uses Postgres or Supabase at all. See the script's own header
comment and `npm run migrate:to-firestore`.

## Notes

- `ADMIN_MFA_OPTIONAL=true` skips the mandatory admin 2FA gate for local dev.
  Never set in production. Irreversible ops (node moves, terminations) still
  demand a real `mfa` claim regardless — the seed sets it on admin accounts.
- `SEED_DEMO=true` (or the Auth emulator being active) makes `npm run db:seed`
  also create the demo accounts + network above; without it, only
  production-safe reference data (categories, the initial commission rule
  set) is seeded.
