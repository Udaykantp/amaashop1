# Super Admin — provisioning & access control

_Last updated: 2026-08-28._

The Super Admin is the only role with the `*` capability (unrestricted). Access
is defence-in-depth: an attacker must defeat **every** layer below, and several
are gated by a deployed environment variable, not by anything in the database.

## The single source of truth

`SUPER_ADMIN_ALLOWLIST` — a comma / whitespace separated list of e-mail
addresses. **Nothing** else grants Super Admin:

- a row with `role = SUPER_ADMIN` whose e-mail is not listed → resolves to zero
  capabilities (`effectiveCapabilities` returns `∅`).
- assigning the role in the UI to a non-listed e-mail → refused.
- a listed e-mail signing in (password **or** Google, any Firebase UID) → is
  (re)promoted to `SUPER_ADMIN` automatically in `syncAppUser`.

```dotenv
# .env.local (production: GCP Secret Manager)
SUPER_ADMIN_ALLOWLIST=ashokkumarmoharana05@gmail.com
BOOTSTRAP_SUPER_ADMIN_EMAIL=ashokkumarmoharana05@gmail.com   # kept in sync; used by seed/script defaults
```

## Where it is enforced

| # | Layer | File | Non-authorised account gets |
|---|---|---|---|
| 1 | Edge middleware | `src/middleware.ts` | no session cookie → `302 /admin/signin` |
| 2 | Sign-in endpoint, `scope:"admin"` | `src/app/api/auth/session/route.ts` | `403` — **no cookie, no user row created**; also requires verified e-mail; per-IP rate limited (6 / 5 min) |
| 3 | Capability resolver | `src/server/rbac.ts` → `effectiveCapabilities` | empty set — no `*` |
| 4 | Page guards | `src/server/auth/guards.ts` → `requireAdminPage`, `requireCapabilityPage` | `redirect('/admin/no-access')` |
| 5 | Server Action guards | `src/server/auth/guards.ts` → `requireAdmin`, `requireCapability` | throw `AuthError('not on the Super Admin allow-list')` |
| 6 | Console shell | `src/app/admin/layout.tsx` | renders the signed-out frame |
| 7 | Role assignment | `src/actions/admin.ts` → `setUserRoleAction` | refuses to grant `SUPER_ADMIN` |
| 8 | First-run bootstrap | `src/server/auth/session.ts` → `syncAppUser` | no auto-promotion |
| 9 | Impersonation ("Login As") | `src/server/auth/session.ts` → `getCurrentUser` | actor not treated as Super Admin |
| 10 | Mandatory 2FA (prod) | `src/server/auth/guards.ts` | `redirect('/admin/verify')` unless the `mfa` claim is set |
| 11 | `robots` noindex on `/admin` | `src/app/admin/layout.tsx` metadata | admin routes never indexed |
| 12 | Session cookie | `src/server/auth/session.ts` | `HttpOnly` + `Secure` (prod) + `SameSite=lax`; refresh tokens revoked on role change |

## Local dev vs the real Firebase project

Dev runs against the **local Auth emulator** (`FIREBASE_AUTH_EMULATOR_HOST` set).
Users created there are visible only at the Emulator UI
(**http://127.0.0.1:4000** → Authentication) and **never** in
console.firebase.google.com — the two user stores are entirely separate, and the
emulator's store is wiped on restart.

### Point the app at the real project (`amaashop-80cfd`)

1. Firebase console → Project settings → **Service accounts** → *Generate new
   private key*.
2. In `.env.local` (prod: Secret Manager):
   ```diff
   - NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   - FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   - FIREBASE_SERVICE_ACCOUNT_JSON=
   + FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"amaashop-80cfd",...}
   ```
3. Console → **Authentication → Sign-in method**: enable **Email/Password** and
   **Google**. Console → Authentication → **Settings**: enable **Email
   enumeration protection** and **One account per email address**.
4. `npm run admin:create -- ashokkumarmoharana05@gmail.com --send-reset`
   → creates the user in the real project, sets claims
   `{ role: SUPER_ADMIN, mfa: true }`, writes an `audit_logs` row, prints a
   one-time password-reset link.
5. Remove `ADMIN_MFA_OPTIONAL` (dev-only bypass of the 2FA gate).

## Provisioning command

Idempotent — safe to re-run (Firebase user, claims, `app_users` row, audit entry):

```bash
npm run admin:create -- ashokkumarmoharana05@gmail.com --name "Ashok Kumar Moharana"
npm run admin:create -- ashokkumarmoharana05@gmail.com --password 'S0me-Strong-Pass!'
npm run admin:create -- ashokkumarmoharana05@gmail.com --send-reset      # real project
```

Emulator default password (also set by `npm run db:seed`): `Admin@12345`.

## Signing in to /admin (phone + password)

`/admin/signin` takes an **e-mail OR mobile number + password** (no Google
button). A mobile number is the account's Firebase Auth `phoneNumber` (unique per
project); the password is the account's e-mail/password credential either way.
Flow: `POST /api/auth/admin-signin` → (phone only) resolve to the account → Firebase verifies the password
→ same authorisation as the `scope:"admin"` session route (verified e-mail +
allow-listed Super Admin / admin role) → session cookie. The account's e-mail is
never sent to the browser; every credential failure returns one generic message;
rate-limited per IP and per phone.

One-time, attach the number to the admin account:

```bash
npm run admin:set-phone -- ashokkumarmoharana05@gmail.com 9876543210
```

Until this has been run, that admin cannot use the sign-in form.

## Adding / rotating / revoking

- **Add**: put the e-mail in `SUPER_ADMIN_ALLOWLIST`, redeploy the secret, then
  `npm run admin:create -- <email> --send-reset`.
- **Revoke**: remove the e-mail from `SUPER_ADMIN_ALLOWLIST` (takes effect on the
  next request, no code deploy) **and** set the row's role to a lower one via
  Users & roles so it isn't left dangling. Then disable / delete the Firebase
  user in the console.

## IdP-level block (Identity Platform blocking functions)

Code lives in [`functions/`](../functions). **Deployed and active** on
`amaashop-80cfd` (Identity Platform enabled 2026-08-28):

| Trigger | Function | Cloud Run URI |
|---|---|---|
| `beforeSignIn` | `enforcesuperadminonsignin` | `enforcesuperadminonsignin-fqaxirvtgq-uc.a.run.app` |
| `beforeCreate` | `enforcesuperadminoncreate` | `enforcesuperadminoncreate-fqaxirvtgq-uc.a.run.app` |

They guarantee the `role=SUPER_ADMIN` claim can only ride on an allow-listed
e-mail, before any token is minted, for every provider. Both fail open.

Verify anytime:
```bash
firebase functions:list --project amaashop-80cfd
# or GET .../identitytoolkit.googleapis.com/admin/v2/projects/amaashop-80cfd/config → blockingFunctions.triggers
```

Change `SUPER_ADMIN_ALLOWLIST` in **both** `.env.local` (app) and
`functions/.env` (functions), then `npm run functions:deploy`. If the deploy
reports "unchanged" and skips the config write, bump the `rev:` comment in
`functions/src/index.ts` to force it.

## Production checklist

- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` from Secret Manager, emulator vars removed
- [ ] `SUPER_ADMIN_ALLOWLIST` set to exactly the intended e-mail(s)
- [ ] `ADMIN_MFA_OPTIONAL` **unset**; every admin has the `mfa` claim
- [ ] Email enumeration protection + one-account-per-email ON in Firebase
- [ ] `/admin` fronted by HTTPS only; consider IAP / IP allow-list at the LB
- [ ] Rate-limit store moved to Redis/Memorystore if running >1 instance
- [ ] `audit_logs` shipped to Cloud Logging with a retention + alerting policy
