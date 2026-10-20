"use client";

/**
 * JoinGate previously forced all visitors to register as a distributor before accessing the storefront.
 * It has now been disabled so the storefront can be browsed freely.
 */
export function JoinGate({ turnstileSiteKey = null }: { turnstileSiteKey?: string | null }) {
  // Suppress unused variable warning while keeping API compatibility
  void turnstileSiteKey;
  return null;
}
