import "server-only";

/**
 * Minimal fixed-window rate limiter (in-process).
 *
 * Good enough to blunt credential-stuffing / brute force against the auth
 * endpoints on a single instance. It is NOT distributed — behind more than one
 * server instance each keeps its own counters. For production hardening move
 * this to a shared store (Upstash Redis / Memorystore) behind the same
 * `rateLimit()` signature.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// opportunistic sweep so the map can't grow unbounded
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * @param key      caller identity — e.g. `auth:session:<ip>`
 * @param limit    max requests per window
 * @param windowMs window length in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - existing.count, retryAfterSec: 0 };
}

/** Best-effort client IP from proxy headers (Cloud Run / LB set these). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
