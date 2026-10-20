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

const MOCK_OFFICE_CONTEXT: OfficeContext = {
  userId: "usr-mem-01",
  memberProfileId: "mem-1",
  memberCode: "AMA-7KQ4MT",
  displayName: "Sunita Devi",
  email: "sunita.devi@example.com",
  status: "ACTIVE",
  frozen: false,
  impersonated: false,
};

/**
 * Resolve the signed-in distributor for a `/office` page.
 *  - in mock mode (backend not configured) -> returns mock distributor context
 *  - not signed in                 -> /office/login
 *  - signed in, not a distributor  -> /office/join  (become one first)
 *  - signed in distributor         -> context
 */
export async function getOfficeContext(): Promise<OfficeContext> {
  const isConfigured = backendStatus().configured;
  const user = await getCurrentUser().catch(() => null);

  if (!user) {
    if (!isConfigured) return MOCK_OFFICE_CONTEXT;
    redirect("/office/login");
  }

  if (!user.memberProfileId) {
    if (!isConfigured) return MOCK_OFFICE_CONTEXT;
    redirect("/office/join");
  }

  const snap = await doc(Collections.memberProfiles, user.memberProfileId).get();
  if (!snap.exists) {
    if (!isConfigured) return MOCK_OFFICE_CONTEXT;
    redirect("/office/join");
  }
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
