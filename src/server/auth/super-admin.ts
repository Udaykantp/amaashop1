/**
 * Super Admin e-mail allow-list.
 *
 * `SUPER_ADMIN` is the only role that carries the `*` capability, so it is
 * gated by a second, independent control: an explicit e-mail allow-list.
 *
 * Even a row with `role = SUPER_ADMIN` in the database — or a stale Firebase
 * custom claim — grants **nothing** unless the account's verified e-mail is on
 * this list. This bounds the blast radius of a mis-set role, a leaked claim, or
 * direct DB tampering: promoting an attacker to Super Admin also requires
 * editing a deployed environment variable.
 *
 * Configure with `SUPER_ADMIN_ALLOWLIST` (comma / whitespace / semicolon
 * separated, case-insensitive). Falls back to `BOOTSTRAP_SUPER_ADMIN_EMAIL`
 * so a fresh install that only set the bootstrap var still works.
 *
 *   SUPER_ADMIN_ALLOWLIST=ashokkumarmoharana05@gmail.com
 *
 * No `"server-only"` guard: this module is pure env + string work and is also
 * imported by `src/server/rbac.ts`, which the provisioning script pulls in
 * outside the Next.js server runtime.
 */

let cache: { raw: string; set: ReadonlySet<string> } | null = null;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** The configured set of allow-listed Super Admin e-mails (lower-cased). */
export function superAdminAllowlist(): ReadonlySet<string> {
  const raw = (
    process.env.SUPER_ADMIN_ALLOWLIST ??
    process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ??
    ""
  ).trim();

  if (cache && cache.raw === raw) return cache.set;

  const set = new Set(
    raw
      .split(/[\s,;]+/)
      .map(normalize)
      .filter(Boolean),
  );
  cache = { raw, set };
  return set;
}

/** True when `email` is allowed to hold Super Admin privileges. */
export function isAllowlistedSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return superAdminAllowlist().has(normalize(email));
}

/** True when nobody is configured — used to warn loudly at startup / in scripts. */
export function superAdminAllowlistIsEmpty(): boolean {
  return superAdminAllowlist().size === 0;
}
