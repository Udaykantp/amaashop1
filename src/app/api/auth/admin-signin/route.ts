import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { mayUseAdminConsole } from "@/server/auth/admin-access";
import { adminAuth } from "@/server/auth/admin";
import { recordAdminAccessRequest } from "@/server/auth/admin-requests";
import { verifyEmailPassword } from "@/server/auth/password-verify";
import { createSessionCookie, inspectIdToken } from "@/server/auth/session";
import { log } from "@/server/log";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { normalizePhone } from "@/server/referral/resolve";

export const runtime = "nodejs"; // firebase-admin needs Node, not Edge

const bodySchema = z.object({
  /** E-mail address or 10-digit mobile number. */
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(256),
});

// Tight limits: per-IP against spraying, per-account against a distributed guess
// at one admin's password.
const WINDOW = 5 * 60_000;
const LIMIT = { ip: 6, account: 8 };

// One message for every credential failure so the response never reveals whether
// an e-mail / phone number belongs to an account.
const BAD_CREDENTIALS = "That e-mail / phone number or password doesn’t match our records.";

/**
 * Admin console sign-in with an e-mail address OR a mobile number, plus password.
 *
 * A mobile number is resolved to the account server-side (Auth `phoneNumber`,
 * unique per project); the password is always verified by Firebase itself, so
 * the e-mail behind a phone login never leaves the server. Authorisation is
 * identical to `POST /api/auth/session` with `scope: "admin"`: verified e-mail +
 * allow-listed Super Admin / admin role.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your e-mail or mobile number and your password." },
      { status: 400 },
    );
  }
  const { identifier, password } = parsed.data;

  // "@" => e-mail login, otherwise a mobile number.
  const isEmail = identifier.includes("@");
  let email: string | null = null;
  let e164: string | null = null;
  if (isEmail) {
    if (!z.string().email().safeParse(identifier).success) {
      return NextResponse.json({ error: "Enter a valid e-mail address." }, { status: 400 });
    }
    email = identifier.toLowerCase();
  } else {
    const phone10 = normalizePhone(identifier);
    if (!phone10) {
      return NextResponse.json(
        { error: "Enter a valid e-mail address or 10-digit mobile number." },
        { status: 400 },
      );
    }
    e164 = `+91${phone10}`;
  }

  const ip = clientIp(req);
  const ipLimit = rateLimit(`auth:admin-signin:ip:${ip}`, LIMIT.ip, WINDOW);
  const accountLimit = rateLimit(`auth:admin-signin:acct:${email ?? e164}`, LIMIT.account, WINDOW);
  const blocked = !ipLimit.ok ? ipLimit : !accountLimit.ok ? accountLimit : null;
  if (blocked) {
    log.warn("admin sign-in rate-limited", { ip });
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "retry-after": String(blocked.retryAfterSec) } },
    );
  }

  try {
    if (e164) {
      try {
        email = (await adminAuth().getUserByPhoneNumber(e164)).email ?? null;
      } catch (err) {
        if ((err as { code?: string })?.code !== "auth/user-not-found") throw err;
      }
      if (!email) {
        log.warn("admin sign-in: no account for phone", { ip });
        return NextResponse.json({ error: BAD_CREDENTIALS }, { status: 401 });
      }
    }
    if (!email) return NextResponse.json({ error: BAD_CREDENTIALS }, { status: 401 });

    const verified = await verifyEmailPassword(email, password);
    if (!verified.ok) {
      if (verified.reason === "throttled") {
        return NextResponse.json(
          { error: "Too many attempts. Try again in a few minutes." },
          { status: 429 },
        );
      }
      if (verified.reason === "disabled") {
        return NextResponse.json(
          { error: "This account has been disabled. Contact support." },
          { status: 403 },
        );
      }
      log.warn("admin sign-in: wrong password", { ip });
      return NextResponse.json({ error: BAD_CREDENTIALS }, { status: 401 });
    }

    const { uid, emailVerified, displayName } = await inspectIdToken(verified.idToken);
    if (!emailVerified) {
      return NextResponse.json(
        { error: "Verify your e-mail address before signing in to the console." },
        { status: 403 },
      );
    }
    if (!(await mayUseAdminConsole(uid, email))) {
      // Correct credentials, but not an admin: no session cookie, no app_users row.
      log.warn("admin console sign-in rejected", { ip, email });
      await recordAdminAccessRequest({ uid, email, displayName });
      return NextResponse.json(
        { error: "This account isn’t authorised for the admin console." },
        { status: 403 },
      );
    }

    await createSessionCookie(verified.idToken);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.warn("admin sign-in failed", { err: String(err) });
    return NextResponse.json({ error: "Could not sign in. Please try again." }, { status: 500 });
  }
}
