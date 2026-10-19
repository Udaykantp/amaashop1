import type { UserRole } from "@/server/enums";
import { isAllowlistedSuperAdminEmail } from "@/server/auth/super-admin";

/**
 * Capability-based access control.
 *
 * Every protected admin action maps to a capability string. A user's effective
 * capabilities are: the defaults for their `role`, PLUS `extraCapabilities`,
 * MINUS `deniedCapabilities`. This is how the Super Admin provisions "custom,
 * restricted sub-roles" for staff without a code change — grant/deny individual
 * capabilities on a user in Users & roles.
 *
 * `*` = everything (Super Admin only).
 */

export const CAPABILITIES = [
  // catalog / store
  "catalog.view",
  "catalog.write", // product + category CRUD, media, CSV import
  "catalog.volume.write", // set PV / BV
  "inventory.write", // stock overrides, low-stock config
  "autoship.write",
  // network / genealogy
  "network.view",
  "network.move", // manual node placement (2FA + audit)
  "network.freeze", // freeze / unfreeze a distributor
  "network.terminate", // terminate + downline compression
  // commissions / finance
  "commission.view",
  "commission.rules.write", // adjust % / thresholds / min PV
  "commission.run.preview",
  "commission.run.release", // "Release Funds"
  "wallet.adjust", // manual adjustments / clawbacks
  "withdrawal.review", // approve / hold / reject
  "payout.process",
  "tax.view",
  // members / compliance / support
  "member.view",
  "member.create", // enroll a distributor directly from the admin panel
  "member.edit", // fix up contact details (e.g. add a missing phone number) on an existing distributor
  "member.delete", // hard-delete a distributor with no downline / no financial history
  "member.passwordReset",
  "member.impersonate", // "Login As"
  "application.review", // public /join registration funnel: approve / hold / reject
  "kyc.review",
  "order.view",
  "order.track",
  // platform
  "users.manage", // roles + capability grants
  "audit.view",
  "settings.write",
  "backup.run",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const CATALOG: Capability[] = [
  "catalog.view",
  "catalog.write",
  "catalog.volume.write",
  "inventory.write",
  "autoship.write",
  "order.view",
  "order.track", // dispatch: advance an order's fulfilment status
];

const FINANCE: Capability[] = [
  "commission.view",
  "commission.run.preview",
  "commission.run.release",
  "wallet.adjust",
  "withdrawal.review",
  "payout.process",
  "tax.view",
  "member.view",
  "order.view",
];

const SUPPORT: Capability[] = [
  "member.view",
  "member.edit",
  "member.passwordReset",
  "application.review",
  "kyc.review",
  "order.view",
  "order.track",
  "network.view",
];

const NETWORK_OPS: Capability[] = [
  "network.view",
  "network.move",
  "network.freeze",
  "member.view",
  "member.create",
  "member.edit",
  "application.review",
  "kyc.review",
  "commission.view",
  "order.view",
];

const ROLE_CAPS: Record<UserRole, Capability[] | ["*"]> = {
  SUPER_ADMIN: ["*"],
  OPS_ADMIN: NETWORK_OPS,
  FINANCE_ADMIN: FINANCE,
  STORE_MANAGER: CATALOG,
  SUPPORT_COMPLIANCE: SUPPORT,
  MEMBER: [],
  CONSUMER: [],
};

export interface CapabilitySubject {
  role: UserRole;
  /**
   * The account e-mail. Required to resolve `SUPER_ADMIN`: the role only grants
   * `*` when the e-mail is on `SUPER_ADMIN_ALLOWLIST` (see
   * `src/server/auth/super-admin.ts`). Omit it and a `SUPER_ADMIN` subject
   * resolves to **no** capabilities — fail closed.
   */
  email?: string | null;
  extraCapabilities?: string[];
  deniedCapabilities?: string[];
}

/**
 * A *fully effective* Super Admin: the role AND the allow-listed e-mail. A row
 * with `role = SUPER_ADMIN` whose e-mail is not allow-listed is deliberately
 * NOT a Super Admin here.
 */
export function isSuperAdmin(subject: CapabilitySubject): boolean {
  return subject.role === "SUPER_ADMIN" && isAllowlistedSuperAdminEmail(subject.email);
}

/** True for a `SUPER_ADMIN` row whose e-mail is missing from the allow-list. */
export function isUnauthorizedSuperAdmin(subject: CapabilitySubject): boolean {
  return subject.role === "SUPER_ADMIN" && !isAllowlistedSuperAdminEmail(subject.email);
}

/** The user's full effective capability set (Super Admin => the sentinel `*`). */
export function effectiveCapabilities(subject: CapabilitySubject): Set<string> {
  if (subject.role === "SUPER_ADMIN") {
    // Allow-listed => everything. Otherwise the role is inert: no `*`, and no
    // fall-through to a base set (there is none for SUPER_ADMIN).
    return isAllowlistedSuperAdminEmail(subject.email)
      ? new Set<string>(["*"])
      : new Set<string>();
  }
  const base = new Set<string>(ROLE_CAPS[subject.role] as Capability[]);
  for (const c of subject.extraCapabilities ?? []) base.add(c);
  for (const c of subject.deniedCapabilities ?? []) base.delete(c);
  return base;
}

export function can(subject: CapabilitySubject, capability: Capability): boolean {
  const caps = effectiveCapabilities(subject);
  return caps.has("*") || caps.has(capability);
}

export function canAny(subject: CapabilitySubject, ...capabilities: Capability[]): boolean {
  return capabilities.some((c) => can(subject, c));
}

export const ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "OPS_ADMIN",
  "FINANCE_ADMIN",
  "STORE_MANAGER",
  "SUPPORT_COMPLIANCE",
];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  OPS_ADMIN: "Network Admin",
  FINANCE_ADMIN: "Finance / Payout Manager",
  STORE_MANAGER: "Catalog / Store Manager",
  SUPPORT_COMPLIANCE: "Support / Compliance",
  MEMBER: "Distributor",
  CONSUMER: "Customer",
};
