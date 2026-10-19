import "server-only";
import { env } from "@/server/env";

/**
 * Verify an e-mail + password against Firebase Auth from the server, returning a
 * fresh ID token. Used by the phone-number admin sign-in: the browser only ever
 * sends a phone + password, so the account's e-mail address is never disclosed
 * to the client. Firebase still does the actual credential check (and its own
 * brute-force throttling); the IdP blocking functions run as for any sign-in.
 */

const SIGN_IN_PATH = "/v1/accounts:signInWithPassword";

function endpoint(): string {
  const emulator = env.authEmulatorHost;
  if (emulator) {
    return `http://${emulator}/identitytoolkit.googleapis.com${SIGN_IN_PATH}?key=emulator`;
  }
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!key) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured.");
  return `https://identitytoolkit.googleapis.com${SIGN_IN_PATH}?key=${encodeURIComponent(key)}`;
}

export type PasswordVerifyResult =
  | { ok: true; idToken: string }
  | { ok: false; reason: "invalid" | "disabled" | "throttled" };

export async function verifyEmailPassword(
  email: string,
  password: string,
): Promise<PasswordVerifyResult> {
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // The Firebase web key may be HTTP-referrer restricted; identify as the site.
      referer: `${env.siteUrl.replace(/\/$/, "")}/`,
    },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as {
    idToken?: string;
    error?: { message?: string };
  };

  if (res.ok && body.idToken) return { ok: true, idToken: body.idToken };

  const code = body.error?.message ?? "";
  if (code.startsWith("USER_DISABLED")) return { ok: false, reason: "disabled" };
  if (code.startsWith("TOO_MANY_ATTEMPTS")) return { ok: false, reason: "throttled" };
  if (
    code.startsWith("INVALID_PASSWORD") ||
    code.startsWith("INVALID_LOGIN_CREDENTIALS") ||
    code.startsWith("EMAIL_NOT_FOUND")
  ) {
    return { ok: false, reason: "invalid" };
  }
  // Anything else (bad API key, referrer block, network) is a server problem —
  // surface it to the route's catch-all rather than mislabelling as "wrong password".
  throw new Error(`Firebase password verification failed: ${code || res.status}`);
}
