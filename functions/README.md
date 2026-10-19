# functions/ — Identity Platform blocking triggers

IdP-level enforcement of the Super Admin allow-list. Runs inside Google's auth
pipeline, before any token is issued.

| Function | Trigger | Job |
|---|---|---|
| `enforcesuperadminonsignin` | `beforeUserSignedIn` | strip `role=SUPER_ADMIN` if the e-mail isn't allow-listed; re-assert it if it is |
| `enforcesuperadminoncreate` | `beforeUserCreated` | allow-listed e-mail is created as `SUPER_ADMIN`; nobody else can arrive with the claim |

Both **fail open** — on an unexpected error the sign-in proceeds unchanged, so a
bug here can never lock ordinary customers out. The Next.js app's own guards
(`src/server/auth/guards.ts`) remain the fail-closed gate.

## Config

`SUPER_ADMIN_ALLOWLIST` in [`.env`](.env) — keep identical to the app's value.
Change it, then redeploy.

## Commands

```bash
npm --prefix functions ci
npm --prefix functions run build
firebase deploy --only functions --project amaashop-80cfd
firebase functions:log --only enforcesuperadminonsignin
```

## Requirements

- Blaze plan
- Identity Platform enabled (the first blocking-function deploy provisions it;
  otherwise: console → Authentication → Settings → "Identity Platform")
- Node 22 runtime
