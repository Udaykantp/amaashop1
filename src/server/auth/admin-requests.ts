import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "@/server/auth/admin";
import { log } from "@/server/log";

const COLLECTION = "admin_user_request";

/**
 * Logs an attempt to reach the admin console by an account that isn't
 * authorised yet. Purely informational — it does NOT gate access; the admin
 * console keeps deciding access the way it already does (role +
 * `SUPER_ADMIN_ALLOWLIST` in Postgres). This just gives visibility, in
 * Firestore, into who's been trying to get in, with an `approved` flag an
 * operator can flip to `true` by hand as their own record once they've
 * granted real access some other way.
 *
 * Never resets `approved` on a repeat attempt — a second sign-in try before
 * real access is granted must not undo a flag an operator already set.
 */
export async function recordAdminAccessRequest(input: {
  uid: string;
  email: string | null;
  displayName?: string | null;
}): Promise<void> {
  if (!input.email) return;
  try {
    const ref = adminFirestore().collection(COLLECTION).doc(input.uid);
    const snap = await ref.get();
    const now = FieldValue.serverTimestamp();

    if (!snap.exists) {
      await ref.set({
        email: input.email,
        displayName: input.displayName ?? null,
        approved: false,
        firstRequestedAt: now,
        lastRequestedAt: now,
        requestCount: 1,
      });
    } else {
      await ref.update({
        email: input.email,
        ...(input.displayName ? { displayName: input.displayName } : {}),
        lastRequestedAt: now,
        requestCount: FieldValue.increment(1),
      });
    }
  } catch (err) {
    log.warn("failed to record admin access request", { uid: input.uid, err: String(err) });
  }
}
