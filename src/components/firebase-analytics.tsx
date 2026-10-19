"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/firebase/analytics";

/**
 * Mount-once initializer for Firebase Analytics. Renders nothing. Placed in the
 * root layout so a `gtag`/GA `page_view` is registered on first load; init is
 * client-only and self-disables when analytics isn't configured (see
 * `initAnalytics`).
 */
export function FirebaseAnalytics(): null {
  useEffect(() => {
    void initAnalytics();
  }, []);
  return null;
}
