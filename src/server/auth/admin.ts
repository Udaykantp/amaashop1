import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK singleton (server only). Verifies session cookies / ID
 * tokens and manages custom claims (`role`, `mfa`).
 *
 * Credentials, in priority order:
 *   1. FIREBASE_AUTH_EMULATOR_HOST set  -> no credential; talk to the local
 *      emulator with a bare project id (local dev).
 *   2. FIREBASE_SERVICE_ACCOUNT_JSON    -> explicit service account.
 *   3. Application Default Credentials   -> GOOGLE_APPLICATION_CREDENTIALS /
 *      the Cloud Run metadata server (production).
 */

const globalForAdmin = globalThis as unknown as { firebaseAdmin?: App };

function projectId(): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "amaashop-dev"
  );
}

function initAdmin(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: projectId() });
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    const svc = JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    return initializeApp({
      credential: cert({
        projectId: svc.project_id,
        clientEmail: svc.client_email,
        privateKey: svc.private_key.replace(/\\n/g, "\n"),
      }),
      projectId: svc.project_id,
    });
  }

  return initializeApp({ projectId: projectId() });
}

export function firebaseAdmin(): App {
  if (!globalForAdmin.firebaseAdmin) globalForAdmin.firebaseAdmin = initAdmin();
  return globalForAdmin.firebaseAdmin;
}

export function adminAuth(): Auth {
  return getAuth(firebaseAdmin());
}

export function adminFirestore(): Firestore {
  return getFirestore(firebaseAdmin());
}

export const usingAuthEmulator = (): boolean => Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
