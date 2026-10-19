"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

/** Which surface the sign-in is for. `"admin"` makes the session endpoint
 *  reject any account that isn't authorised for the console. */
export type SignInScope = "admin";

/** Send a Firebase password-reset email. Always resolves `ok: true` even for an
 *  unknown address (don't leak which emails have accounts). */
export async function sendPasswordReset(email: string): Promise<AuthOutcome> {
  try {
    await sendPasswordResetEmail(firebaseAuth(), email.trim());
    return { ok: true, needsEmailVerification: false };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "";
    if (code === "auth/user-not-found" || code === "auth/invalid-email") {
      return { ok: true, needsEmailVerification: false };
    }
    return { ok: false, error: toMessage(err) };
  }
}

/**
 * Client-side auth. Firebase verifies the credential in the browser; we then
 * hand the resulting ID token to the server (`POST /api/auth/session`), which
 * mints an HttpOnly session cookie. The server never sees the password.
 */

export type AuthOutcome =
  | { ok: true; needsEmailVerification: boolean }
  | { ok: false; error: string };

const FRIENDLY: Record<string, string> = {
  "auth/invalid-credential": "That email or password doesn't match our records.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-disabled": "This account has been disabled. Contact support.",
  "auth/email-already-in-use": "An account with this email already exists — try signing in.",
  "auth/weak-password": "Choose a password of at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed": "Network problem — check your connection and try again.",
};

function toMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  return FRIENDLY[code] ?? "Something went wrong. Please try again.";
}

async function exchangeForSession(cred: UserCredential, scope?: SignInScope): Promise<void> {
  const idToken = await cred.user.getIdToken();
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(scope ? { idToken, scope } : { idToken }),
  });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? "Could not start a session.");
  }
}

export async function signIn(
  email: string,
  password: string,
  opts?: { scope?: SignInScope },
): Promise<AuthOutcome> {
  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth(), email, password);
    await exchangeForSession(cred, opts?.scope);
    return { ok: true, needsEmailVerification: !cred.user.emailVerified };
  } catch (err) {
    return { ok: false, error: err instanceof Error && !(err as { code?: string }).code ? err.message : toMessage(err) };
  }
}

/**
 * Admin console sign-in with an e-mail address OR a mobile number, plus password.
 * The server resolves a phone number to the account, verifies the password with
 * Firebase, then sets the session cookie itself — nothing to exchange client-side.
 */
export async function signInAdmin(identifier: string, password: string): Promise<AuthOutcome> {
  try {
    const res = await fetch("/api/auth/admin-signin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: error ?? "Could not sign in. Please try again." };
    }
    return { ok: true, needsEmailVerification: false };
  } catch {
    return { ok: false, error: FRIENDLY["auth/network-request-failed"]! };
  }
}

/**
 * Google sign-in (popup). `firebaseAuth()` already routes to the local Auth
 * emulator when `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` is set, so this works
 * in dev too (the emulator shows a fake account chooser).
 *
 * `loginHint` pre-fills the account. Authorisation is NOT enforced here — the
 * server does it: with `scope: "admin"` the session endpoint rejects any
 * account that isn't on `SUPER_ADMIN_ALLOWLIST` (or an existing admin role).
 */
export async function signInWithGoogle(opts?: {
  scope?: SignInScope;
  loginHint?: string;
}): Promise<AuthOutcome> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
    ...(opts?.loginHint ? { login_hint: opts.loginHint } : {}),
  });
  try {
    const cred = await signInWithPopup(firebaseAuth(), provider);
    await exchangeForSession(cred, opts?.scope);
    return { ok: true, needsEmailVerification: !cred.user.emailVerified };
  } catch (err) {
    // A rejected exchange (403) or closed popup must not leave the browser
    // half-authenticated against Firebase.
    try {
      await firebaseAuth().signOut();
    } catch {
      /* ignore */
    }
    if ((err as { code?: string })?.code === "auth/popup-closed-by-user") {
      return { ok: false, error: "Sign-in cancelled." };
    }
    return {
      ok: false,
      error:
        err instanceof Error && !(err as { code?: string }).code
          ? err.message
          : toMessage(err),
    };
  }
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthOutcome> {
  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
    if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
    await sendEmailVerification(cred.user).catch(() => {});
    await exchangeForSession(cred);
    return { ok: true, needsEmailVerification: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error && !(err as { code?: string }).code ? err.message : toMessage(err) };
  }
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" });
  try {
    await firebaseAuth().signOut();
  } catch {
    /* ignore */
  }
}
