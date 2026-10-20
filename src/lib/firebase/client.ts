"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

/**
 * Browser Firebase app. Only the public `NEXT_PUBLIC_FIREBASE_*` config — no
 * secrets. Auth here is used purely to obtain an ID token, which is exchanged
 * for an HttpOnly session cookie by `POST /api/auth/session`. Server-side
 * session state never trusts the client SDK.
 *
 * When `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` is set (local dev), auth calls
 * are routed to the local Firebase Auth emulator instead of Google.
 */

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBqaA4zyZH0_jvw7jdeNa3Lrxx_rEqhMQ8",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "amaashop-80cfd.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "amaashop-80cfd",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "amaashop-80cfd.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    "710003828361",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:710003828361:web:e9b482d319990c97364858",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    "G-VNWSYQSDVX",
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function firebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!app) {
    try {
      const existing = getApps()[0];
      if (existing) {
        app = existing;
      } else if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
      }
    } catch (err) {
      console.warn("Firebase App initialization skipped:", err);
      return null;
    }
  }
  return app ?? null;
}

export function firebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  if (auth) return auth;

  try {
    const initializedApp = firebaseApp();
    if (!initializedApp) return null;
    auth = getAuth(initializedApp);

    const emu = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
    if (emu) {
      connectAuthEmulator(auth, `http://${emu}`, { disableWarnings: true });
    }
    return auth;
  } catch (err) {
    console.warn("Firebase Auth initialization skipped:", err);
    return null;
  }
}
