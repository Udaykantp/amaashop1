import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { backendStatus } from "@/server/config";
import { Collections, doc } from "@/server/firestore";
import type { MemberProfileDoc } from "@/server/models";

export interface OfficeContext {
  userId: string;
  memberProfileId: string;
  memberCode: string;
  displayName: string | null;
  email: string | null;
  status: "ACTIVE" | "PENDING_KYC" | "FROZEN" | "TERMINATED" | string;
  frozen: boolean;
  impersonated: boolean;
}

/**
 * Resolve the signed-in distributor for a `/office` page.
 *  - not signed in                 -> /office/login
 *  - signed in, not a distributor  -> /office/join  (become one first)
 *  - signed in distributor         -> context
 *
 * Backoffice access is intentionally *separate* from the `/admin` console:
 * a Super Admin without a member profile is redirected to /office/join like
 * anyone else.
 */
export async function getOfficeContext(): Promise<OfficeContext> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/office/login");
  if (!user.memberProfileId) redirect("/office/join");

  const snap = await doc(Collections.memberProfiles, user.memberProfileId).get();
  if (!snap.exists) redirect("/office/join");
  const profile = snap.data() as MemberProfileDoc;

  return {
    userId: user.uid,
    memberProfileId: user.memberProfileId,
    memberCode: profile.memberCode,
    displayName: user.displayName,
    email: user.email,
    status: profile.status,
    frozen: Boolean(profile.frozenAt),
    impersonated: Boolean(user.impersonatedBy),
  };
}

/** For the login/forgot pages: bounce an already-signed-in distributor inward. */
export async function redirectIfSignedIn(): Promise<void> {
  if (!backendStatus().configured) return;
  const user = await getCurrentUser().catch(() => null);
  if (user?.memberProfileId) redirect("/office");
}
