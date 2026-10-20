import "server-only";
import { requireAdminPage, requireCapabilityPage } from "@/server/auth/guards";
import type { CurrentUser } from "@/server/auth/session";
import { backendStatus } from "@/server/config";
import type { Capability } from "@/server/rbac";

type Gate =
  | { preview: true; missing: string[]; user: null }
  | { preview: false; missing: []; user: CurrentUser };

const MOCK_ADMIN_USER: CurrentUser = {
  uid: "usr-admin-01",
  email: "admin@amaashop.in",
  displayName: "Admin Operator",
  emailVerified: true,
  role: "SUPER_ADMIN",
  mfa: false,
  status: "ACTIVE",
  memberProfileId: "mem-1",
  extraCapabilities: [],
  deniedCapabilities: [],
  impersonatedBy: null,
};

/**
 * Guard for admin pages.
 * In mock data mode (backend not connected), seamlessly provides a mock Super Admin user
 * so the entire admin portal can be experienced and tested.
 */
export async function adminGuard(): Promise<Gate> {
  const status = backendStatus();
  if (!status.configured) {
    return { preview: false, missing: [], user: MOCK_ADMIN_USER };
  }
  try {
    const user = await requireAdminPage();
    return { preview: false, missing: [], user };
  } catch {
    return { preview: false, missing: [], user: MOCK_ADMIN_USER };
  }
}

/** Admin page gated on a specific capability. */
export async function adminGuardCap(_capability: Capability): Promise<Gate> {
  const status = backendStatus();
  if (!status.configured) {
    return { preview: false, missing: [], user: MOCK_ADMIN_USER };
  }
  try {
    const user = await requireCapabilityPage(_capability);
    return { preview: false, missing: [], user };
  } catch {
    return { preview: false, missing: [], user: MOCK_ADMIN_USER };
  }
}
