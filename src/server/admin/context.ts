import "server-only";
import { requireAdminPage, requireCapabilityPage } from "@/server/auth/guards";
import type { CurrentUser } from "@/server/auth/session";
import { backendStatus } from "@/server/config";
import type { Capability } from "@/server/rbac";

type Gate =
  | { preview: true; missing: string[]; user: null }
  | { preview: false; missing: []; user: CurrentUser };

/**
 * Guard for admin pages. When the backend isn't configured yet, returns a
 * preview marker instead of redirecting, so `/admin` renders a "connect the
 * backend" screen rather than bouncing to a sign-in that can't work.
 */
export async function adminGuard(): Promise<Gate> {
  const status = backendStatus();
  if (!status.configured) return { preview: true, missing: status.missing, user: null };
  return { preview: false, missing: [], user: await requireAdminPage() };
}

/** Admin page gated on a specific capability. */
export async function adminGuardCap(capability: Capability): Promise<Gate> {
  const status = backendStatus();
  if (!status.configured) return { preview: true, missing: status.missing, user: null };
  return { preview: false, missing: [], user: await requireCapabilityPage(capability) };
}
