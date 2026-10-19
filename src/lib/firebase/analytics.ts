"use client";

import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { firebaseApp } from "@/lib/firebase/client";

/**
 * Firebase Analytics — browser only, best-effort.
 *
 * The console's `getAnalytics(app)` snippet cannot be called at module scope in
 * a Next.js app: it touches `window`/`document`, so it throws during SSR and in
 * any non-DOM environment (tests, workers). This wrapper defers init to the
 * client, gates it behind Firebase's own `isSupported()` check, and no-ops when
 * analytics isn't configured or when we're pointed at the Auth emulator (local
 * dev — we don't want dev traffic in the real GA property).
 *
 * Call `initAnalytics()` from a `useEffect` (see `<FirebaseAnalytics />`).
 */

let analytics: Analytics | null = null;
let pending: Promise<Analytics | null> | null = null;

export function initAnalytics(): Promise<Analytics | null> {
  if (analytics) return Promise.resolve(analytics);
  if (pending) return pending;

  pending = (async () => {
    if (typeof window === "undefined") return null;
    if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return null;
    if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) return null;
    if (!(await isSupported().catch(() => false))) return null;

    analytics = getAnalytics(firebaseApp());
    return analytics;
  })();

  return pending;
}
