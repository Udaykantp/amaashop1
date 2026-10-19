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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function firebaseApp(): FirebaseApp {
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function firebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(firebaseApp());

  const emu = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emu) {
    connectAuthEmulator(auth, `http://${emu}`, { disableWarnings: true });
  }
  return auth;
}
