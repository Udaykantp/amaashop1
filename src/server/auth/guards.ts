import "server-only";
import { redirect } from "next/navigation";
import type { UserRole } from "@/server/enums";
import { getCurrentUser, type CurrentUser } from "@/server/auth/session";
import { env } from "@/server/env";
import { ADMIN_ROLES, can, isUnauthorizedSuperAdmin, type Capability } from "@/server/rbac";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "MFA_REQUIRED" = "FORBIDDEN",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sign in to continue.", "UNAUTHENTICATED");
  if (user.status !== "ACTIVE") throw new AuthError("Your account is not active.", "FORBIDDEN");
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AuthError("You don't have access to this.", "FORBIDDEN");
  return user;
}

export async function requireMember(): Promise<CurrentUser & { memberProfileId: string }> {
  const user = await requireUser();
  if (!user.memberProfileId) throw new AuthError("This area is for network members.", "FORBIDDEN");
  return user as CurrentUser & { memberProfileId: string };
}

function assertMfa(user: CurrentUser) {
  if (!user.mfa && !env.adminMfaOptional) {
    throw new AuthError("Two-factor authentication is required.", "MFA_REQUIRED");
  }
}

/**
 * A `SUPER_ADMIN` row whose e-mail is not on `SUPER_ADMIN_ALLOWLIST` is inert.
 * Reject it before any admin work so the failure is explicit rather than a
 * confusing "missing permission" further down.
 */
function assertSuperAdminAllowlisted(user: CurrentUser) {
  if (isUnauthorizedSuperAdmin(user)) {
    throw new AuthError("This account is not on the Super Admin allow-list.", "FORBIDDEN");
  }
}

/** Any admin role + a second factor. */
export async function requireAdmin(...roles: UserRole[]): Promise<CurrentUser> {
  const allowed = roles.length ? roles : ADMIN_ROLES;
  const user = await requireRole(...allowed);
  assertSuperAdminAllowlisted(user);
  assertMfa(user);
  return user;
}

/** Admin + a specific capability (role defaults ± per-user grants).
 *  `strict2fa` ignores the dev ADMIN_MFA_OPTIONAL bypass — for irreversible
 *  operations (node moves, terminations) that must always carry a real second
 *  factor per the RBAC spec. */
export async function requireCapability(
  capability: Capability,
  opts: { strict2fa?: boolean } = {},
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!ADMIN_ROLES.includes(user.role)) throw new AuthError("Admin access required.", "FORBIDDEN");
  assertSuperAdminAllowlisted(user);
  if (opts.strict2fa) {
    if (!user.mfa) throw new AuthError("Two-factor authentication is required for this action.", "MFA_REQUIRED");
  } else {
    assertMfa(user);
  }
  if (!can(user, capability)) {
    throw new AuthError(`You don't have the "${capability}" permission.`, "FORBIDDEN");
  }
  return user;
}

// ── page-level variants: redirect instead of throw ──────────────────────────

export async function requireUserPage(returnTo = "/account"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireMemberPage(): Promise<CurrentUser & { memberProfileId: string }> {
  const user = await requireUserPage("/member");
  if (!user.memberProfileId) redirect("/member/join");
  return user as CurrentUser & { memberProfileId: string };
}

export async function requireAdminPage(...roles: UserRole[]): Promise<CurrentUser> {
  const allowed = roles.length ? roles : ADMIN_ROLES;
  const user = await getCurrentUser();
  if (!user) redirect("/admin/signin");
  if (!allowed.includes(user.role)) redirect("/admin/no-access");
  if (isUnauthorizedSuperAdmin(user)) redirect("/admin/no-access");
  if (!user.mfa && !env.adminMfaOptional) redirect("/admin/verify");
  return user;
}

export async function requireCapabilityPage(capability: Capability): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/signin");
  if (!ADMIN_ROLES.includes(user.role)) redirect("/admin/no-access");
  if (isUnauthorizedSuperAdmin(user)) redirect("/admin/no-access");
  if (!user.mfa && !env.adminMfaOptional) redirect("/admin/verify");
  if (!can(user, capability)) redirect("/admin/no-access");
  return user;
}
