import "server-only";
import { env } from "@/server/env";
import { log } from "@/server/log";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Cloudflare Turnstile token from the public `/join` form.
 *
 * There is no OTP on the registration funnel (founder's call) — this CAPTCHA
 * plus a phone-uniqueness check is the only bot shield before a lead lands in
 * the review queue.
 *
 * When `TURNSTILE_SECRET_KEY` is unset (local dev / CI) the check is skipped and
 * a warning is logged, matching the rest of `src/server/*` which boots in a
 * partially-configured environment.
 */
export async function verifyCaptcha(token: string | null, ip?: string | null): Promise<boolean> {
  const secret = env.turnstileSecretKey;
  if (!secret) {
    log.warn("captcha check skipped — TURNSTILE_SECRET_KEY not set");
    return true;
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      // don't let a slow verifier hang the Server Action
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      log.warn("captcha verification failed", { errors: data["error-codes"] ?? [] });
    }
    return Boolean(data.success);
  } catch (err) {
    log.error("captcha verification errored", { err: String(err) });
    return false;
  }
}
