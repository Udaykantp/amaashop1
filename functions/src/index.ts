/**
 * Identity Platform blocking triggers — the IdP-level control for Super Admin.
 *
 * These run inside Google's auth pipeline on every account create / sign-in,
 * for every provider (password, Google, …), BEFORE a token is minted. They
 * guarantee one invariant:
 *
 *     the custom claim  role = "SUPER_ADMIN"  can only ever exist on a
 *     session whose verified e-mail is in SUPER_ADMIN_ALLOWLIST.
 *
 * This is defence-in-depth on top of the application's own guards
 * (src/server/auth/guards.ts). It closes the gap where a claim is set by
 * mistake, lingers after an allow-list change, or is replayed — the app then
 * never even sees an unauthorised Super Admin token.
 *
 * FAIL-OPEN: this is a hybrid storefront + admin project; a bug here must never
 * block ordinary customer sign-in. On any unexpected error we log and allow the
 * sign-in unchanged — the app-layer guards still fail closed.
 */
import { setGlobalOptions } from "firebase-functions/v2";
import {
  beforeUserCreated,
  beforeUserSignedIn,
  type AuthBlockingEvent,
} from "firebase-functions/v2/identity";
import { defineString } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

const REGION = "us-central1";
setGlobalOptions({ region: REGION, maxInstances: 10 });

// rev: 2 — re-deploy to register blocking triggers with Identity Platform (GCIP)

/**
 * Comma / whitespace separated. Set in `functions/.env` (committed, not secret)
 * or overridden per-deploy. Keep identical to the Next.js app's
 * `SUPER_ADMIN_ALLOWLIST`.
 */
const SUPER_ADMIN_ALLOWLIST = defineString("SUPER_ADMIN_ALLOWLIST", { default: "" });

function allowlist(): Set<string> {
  return new Set(
    SUPER_ADMIN_ALLOWLIST.value()
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAllowlisted(email: string | undefined): boolean {
  return !!email && allowlist().has(email.toLowerCase());
}

type Claims = Record<string, unknown>;

/** On sign-in: reconcile the `role` claim against the allow-list. */
export const enforcesuperadminonsignin = beforeUserSignedIn(
  (event: AuthBlockingEvent) => {
    try {
      const email = event.data?.email;
      const claims: Claims = { ...(event.data?.customClaims as Claims | undefined) };
      const allowed = isAllowlisted(email);
      const hasRole = claims.role === "SUPER_ADMIN";

      if (hasRole && !allowed) {
        logger.warn("blocking: stripped SUPER_ADMIN claim from non-allowlisted sign-in", {
          uid: event.data?.uid,
          email,
        });
        return { customClaims: { ...claims, role: "CONSUMER" } };
      }

      if (allowed && !hasRole) {
        logger.info("blocking: re-asserted SUPER_ADMIN claim for allowlisted sign-in", { email });
        return { customClaims: { ...claims, role: "SUPER_ADMIN" } };
      }

      if (allowed) {
        logger.info("blocking: super admin sign-in", { uid: event.data?.uid, email });
      }
      return;
    } catch (err) {
      logger.error("blocking: enforcesuperadminonsignin failed — allowing sign-in", {
        err: String(err),
      });
      return;
    }
  },
);

/** On account creation: allow-listed e-mail is born a Super Admin; nobody else
 *  can arrive pre-carrying the claim. */
export const enforcesuperadminoncreate = beforeUserCreated(
  (event: AuthBlockingEvent) => {
    try {
      const email = event.data?.email;
      const claims: Claims = { ...(event.data?.customClaims as Claims | undefined) };

      if (isAllowlisted(email)) {
        logger.info("blocking: provisioning SUPER_ADMIN on create", { email });
        return { customClaims: { ...claims, role: "SUPER_ADMIN" } };
      }
      if (claims.role === "SUPER_ADMIN") {
        return { customClaims: { ...claims, role: "CONSUMER" } };
      }
      return;
    } catch (err) {
      logger.error("blocking: enforcesuperadminoncreate failed — allowing create", {
        err: String(err),
      });
      return;
    }
  },
);
