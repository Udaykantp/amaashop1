import "server-only";

/**
 * Typed, lazy access to server environment. Values are read on first use and
 * cached; a missing required value throws only when that feature is actually
 * exercised, so the app still boots in a partially-configured dev environment.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. See .env.local.example.`,
    );
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  get siteUrl() {
    return optional("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },

  // Firebase Admin
  get authEmulatorHost() {
    return optional("FIREBASE_AUTH_EMULATOR_HOST");
  },
  get firebaseServiceAccountJson() {
    // Not needed when talking to the local Auth emulator.
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return "";
    return required("FIREBASE_SERVICE_ACCOUNT_JSON");
  },
  get firebaseProjectId() {
    return optional("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "amaashop-dev");
  },
  /** Dev-only escape hatch for the mandatory admin 2FA gate. */
  get adminMfaOptional() {
    return !this.isProd && optional("ADMIN_MFA_OPTIONAL") === "true";
  },

  // Session
  get sessionCookieName() {
    return optional("SESSION_COOKIE_NAME", "amaashop_session");
  },
  get sessionCookieMaxAgeMs() {
    const days = Number(optional("SESSION_COOKIE_MAX_AGE_DAYS", "5"));
    return days * 24 * 60 * 60 * 1000;
  },

  // Field-level crypto
  get fieldEncryptionKey() {
    return required("FIELD_ENCRYPTION_KEY");
  },
  get blindIndexKey() {
    return required("BLIND_INDEX_KEY");
  },

  // GCS
  get gcsBucketKyc() {
    return required("GCS_BUCKET_KYC");
  },

  get workerSharedSecret() {
    return required("WORKER_SHARED_SECRET");
  },

  get paymentProvider() {
    return optional("PAYMENT_PROVIDER", "SIMULATED");
  },

  /**
   * Cloudflare Turnstile secret for the public `/join` registration form.
   * Blank in dev/CI => the CAPTCHA check is skipped (see src/server/captcha.ts).
   */
  get turnstileSecretKey() {
    return optional("TURNSTILE_SECRET_KEY");
  },
};
