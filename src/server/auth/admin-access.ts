import "server-only";
import { Collections, doc } from "@/server/firestore";
import type { AppUserDoc } from "@/server/models";
import { isAllowlistedSuperAdminEmail } from "@/server/auth/super-admin";
import { isAdminRole } from "@/server/rbac";

/** True if this account may start a session on the admin sign-in surface:
 *  an allow-listed Super Admin e-mail, or an already-provisioned admin role. */
export async function mayUseAdminConsole(uid: string, email: string | null): Promise<boolean> {
  if (isAllowlistedSuperAdminEmail(email)) return true;
  const snap = await doc(Collections.appUsers, uid).get();
  return snap.exists ? isAdminRole((snap.data() as AppUserDoc).role) : false;
}
