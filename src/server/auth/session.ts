import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import type { UserRole } from "@/server/enums";
import { adminAuth } from "@/server/auth/admin";
import { Collections, doc, nowSentinel, serverTimestamp } from "@/server/firestore";
import type { AppUserDoc } from "@/server/models";
import { env } from "@/server/env";
import { log } from "@/server/log";
import { isAllowlistedSuperAdminEmail } from "@/server/auth/super-admin";
import { isSuperAdmin } from "@/server/rbac";

export type SessionClaims = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  role: UserRole;
  mfa: boolean;
};

export type CurrentUser = SessionClaims & {
  displayName: string | null;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  memberProfileId: string | null;
  extraCapabilities: string[];
  deniedCapabilities: string[];
  /** Set when a Super Admin is viewing the app AS this user ("Login As"). */
  impersonatedBy: { uid: string; email: string | null } | null;
};

const IMPERSONATION_COOKIE = "amaashop_imp";

// ── session cookie (Firebase) ──────────────────────────────────────────────

export async function createSessionCookie(idToken: string): Promise<void> {
  const decoded = await adminAuth().verifyIdToken(idToken, true);

  const authAgeMs = Date.now() - decoded.auth_time * 1000;
  if (authAgeMs > 5 * 60 * 1000) throw new Error("Stale sign-in. Please try again.");

  const expiresIn = env.sessionCookieMaxAgeMs;
  const cookie = await adminAuth().createSessionCookie(idToken, { expiresIn });

  await syncAppUser(decoded.uid, decoded.email ?? null, decoded.name ?? null);

  const store = await cookies();
  store.set(env.sessionCookieName, cookie, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(expiresIn / 1000),
  });
  store.delete(IMPERSONATION_COOKIE); // a fresh sign-in never carries impersonation
}

/** Verify a client ID token without creating a session — used to authorise a
 *  sign-in surface before minting the cookie. */
export async function inspectIdToken(
  idToken: string,
): Promise<{ uid: string; email: string | null; emailVerified: boolean; displayName: string | null }> {
  const d = await adminAuth().verifyIdToken(idToken, true);
  return {
    uid: d.uid,
    email: (d.email as string) ?? null,
    emailVerified: Boolean(d.email_verified),
    displayName: (d.name as string) ?? null,
  };
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  const existing = store.get(env.sessionCookieName)?.value;
  store.delete(env.sessionCookieName);
  store.delete(IMPERSONATION_COOKIE);
  if (existing) {
    try {
      const decoded = await adminAuth().verifySessionCookie(existing);
      await adminAuth().revokeRefreshTokens(decoded.sub);
    } catch {
      /* already invalid */
    }
  }
}

export const verifySession = cache(async (): Promise<SessionClaims | null> => {
  const token = (await cookies()).get(env.sessionCookieName)?.value;
  if (!token) return null;
  try {
    const d = await adminAuth().verifySessionCookie(token, true);
    return {
      uid: d.uid,
      email: (d.email as string) ?? null,
      emailVerified: Boolean(d.email_verified),
      role: (d.role as UserRole) ?? "CONSUMER",
      mfa: d.mfa === true || d.firebase?.sign_in_second_factor != null,
    };
  } catch (err) {
    log.debug("session verify failed", { err: String(err) });
    return null;
  }
});

// ── impersonation cookie (HMAC-signed, our own) ────────────────────────────

function signImp(payload: string): string {
  const mac = createHmac("sha256", env.blindIndexKey).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function readImp(raw: string | undefined): { actorUid: string; targetUid: string } | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = createHmac("sha256", env.blindIndexKey).update(payload).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const [actorUid, targetUid, expStr] = payload.split(":");
  if (!actorUid || !targetUid || !expStr) return null;
  if (Date.now() > Number(expStr)) return null;
  return { actorUid, targetUid };
}

/** Start impersonating `targetUid`. Caller MUST already be verified Super Admin. */
export async function beginImpersonation(actorUid: string, targetUid: string): Promise<void> {
  const exp = Date.now() + 60 * 60 * 1000; // 1 hour
  const value = signImp(`${actorUid}:${targetUid}:${exp}`);
  (await cookies()).set(IMPERSONATION_COOKIE, value, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function endImpersonation(): Promise<void> {
  (await cookies()).delete(IMPERSONATION_COOKIE);
}

// ── current user (session + Firestore + impersonation) ────────────────────

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const claims = await verifySession();
  if (!claims) return null;

  const imp = readImp((await cookies()).get(IMPERSONATION_COOKIE)?.value);

  // Impersonation: the session belongs to a Super Admin, but we return the
  // TARGET user's context (marked). Guarded: the real session user must still
  // be a Super Admin right now.
  if (imp && imp.actorUid === claims.uid) {
    const actorSnap = await doc(Collections.appUsers, claims.uid).get();
    const actor = actorSnap.exists ? (actorSnap.data() as AppUserDoc) : null;
    if (actor && isSuperAdmin({ role: actor.role, email: actor.email })) {
      const target = await loadUser(imp.targetUid);
      if (target) {
        return {
          ...target,
          emailVerified: true,
          mfa: claims.mfa,
          impersonatedBy: { uid: claims.uid, email: actor.email },
        };
      }
    }
  }

  const self = await loadUser(claims.uid);
  if (!self) return null;
  return {
    ...self,
    emailVerified: claims.emailVerified,
    mfa: claims.mfa,
    impersonatedBy: null,
  };
});

async function loadUser(
  uid: string,
): Promise<Omit<CurrentUser, "impersonatedBy" | "mfa" | "emailVerified"> | null> {
  const snap = await doc(Collections.appUsers, uid).get();
  if (!snap.exists) return null;
  const row = snap.data() as AppUserDoc;
  if (row.status === "CLOSED") return null;
  return {
    uid,
    email: row.email,
    role: row.role,
    displayName: row.displayName,
    status: row.status,
    memberProfileId: row.memberProfileId,
    extraCapabilities: row.extraCapabilities,
    deniedCapabilities: row.deniedCapabilities,
  };
}

// ── app_users sync + bootstrap ───────────────────────────────────────────

export async function syncAppUser(
  uid: string,
  email: string | null,
  displayName: string | null,
): Promise<void> {
  const ref = doc(Collections.appUsers, uid);

  // Any account whose e-mail is on SUPER_ADMIN_ALLOWLIST is (kept) a SUPER_ADMIN
  // on every sign-in — regardless of which provider (password, Google, …) or
  // Firebase UID it comes in on. The allow-list is the single source of truth
  // and is environment-gated, so this is safe to apply idempotently rather than
  // as a one-shot bootstrap. Everyone else is created as a CONSUMER and keeps
  // whatever role they already have.
  const isFounder = isAllowlistedSuperAdminEmail(email);

  const role = await ref.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existingRole = snap.exists ? (snap.data() as AppUserDoc).role : null;

    if (isFounder && existingRole !== "SUPER_ADMIN") {
      log.warn("elevating allow-listed account to SUPER_ADMIN", { uid, email });
    }

    if (!snap.exists) {
      const data: AppUserDoc = {
        email,
        phone: null,
        displayName,
        role: isFounder ? "SUPER_ADMIN" : "CONSUMER",
        status: "ACTIVE",
        extraCapabilities: [],
        deniedCapabilities: [],
        memberProfileId: null,
        createdAt: nowSentinel(),
        updatedAt: nowSentinel(),
      };
      tx.set(ref, data);
      return data.role;
    }

    const nextRole = isFounder ? ("SUPER_ADMIN" as UserRole) : existingRole!;
    tx.update(ref, {
      ...(email != null ? { email } : {}),
      ...(displayName != null ? { displayName } : {}),
      ...(isFounder ? { role: nextRole } : {}),
      updatedAt: serverTimestamp(),
    });
    return nextRole;
  });

  try {
    const claims = (await adminAuth().getUser(uid)).customClaims ?? {};
    if (claims.role !== role) {
      await adminAuth().setCustomUserClaims(uid, { ...claims, role });
    }
  } catch (err) {
    log.warn("could not sync role claim", { uid, err: String(err) });
  }
}

/** Admin-only: change a user's role in Firestore + Firebase claims, force re-auth. */
export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await doc(Collections.appUsers, uid).update({ role, updatedAt: serverTimestamp() });
  const claims = (await adminAuth().getUser(uid)).customClaims ?? {};
  await adminAuth().setCustomUserClaims(uid, { ...claims, role });
  await adminAuth().revokeRefreshTokens(uid);
}

/** Admin-only: set the `mfa` custom claim (used until real TOTP enrolment). */
export async function setMfaClaim(uid: string, mfa: boolean): Promise<void> {
  const claims = (await adminAuth().getUser(uid)).customClaims ?? {};
  await adminAuth().setCustomUserClaims(uid, { ...claims, mfa });
}
