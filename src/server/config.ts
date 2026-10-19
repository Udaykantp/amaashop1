import "server-only";

/**
 * Whether the backend (Firestore + Firebase Auth) is configured. When it
 * isn't, member/admin screens render in "preview mode" with placeholder data
 * instead of crashing, so `npm run dev` is still useful before `.env.local`
 * is filled in.
 */
export function backendStatus(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    missing.push("FIREBASE_SERVICE_ACCOUNT_JSON");
  }
  return { configured: missing.length === 0, missing };
}
