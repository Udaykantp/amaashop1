import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { recordAdminAccessRequest } from "@/server/auth/admin-requests";
import { clearSession, createSessionCookie, inspectIdToken } from "@/server/auth/session";
import { mayUseAdminConsole } from "@/server/auth/admin-access";
import { log } from "@/server/log";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs"; // firebase-admin needs Node, not Edge

const bodySchema = z.object({
  idToken: z.string().min(20),
  /** `"admin"` = this sign-in is for the console; reject non-authorised accounts. */
  scope: z.enum(["admin"]).optional(),
});

// per-IP: 10 session exchanges / 5 min (tighter for the admin surface)
const LIMIT = { window: 5 * 60_000, general: 10, admin: 6 };

/** Exchange a Firebase ID token (from client sign-in) for a session cookie. */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { idToken, scope } = parsed.data;

  const ip = clientIp(req);
  const rl = rateLimit(
    `auth:session:${scope ?? "general"}:${ip}`,
    scope === "admin" ? LIMIT.admin : LIMIT.general,
    LIMIT.window,
  );
  if (!rl.ok) {
    log.warn("auth session rate-limited", { ip, scope });
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

  try {
    if (scope === "admin") {
      const { uid, email, emailVerified, displayName } = await inspectIdToken(idToken);
      if (!emailVerified) {
        return NextResponse.json(
          { error: "Verify your e-mail address before signing in to the console." },
          { status: 403 },
        );
      }
      if (!(await mayUseAdminConsole(uid, email))) {
        // No session cookie, no app_users row created.
        log.warn("admin console sign-in rejected", { ip, email });
        await recordAdminAccessRequest({ uid, email, displayName });
        return NextResponse.json(
          { error: "This account isn’t authorised for the admin console." },
          { status: 403 },
        );
      }
    }
    await createSessionCookie(idToken);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.warn("session creation failed", { err: String(err) });
    return NextResponse.json({ error: "Could not start a session." }, { status: 401 });
  }
}

/** Sign out: clear the cookie and revoke refresh tokens. */
export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
