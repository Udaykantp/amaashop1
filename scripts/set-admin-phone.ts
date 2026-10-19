/**
 * Attach a mobile number to an existing admin's Firebase Auth account so they
 * can sign in to /admin with phone + password. Idempotent, safe to re-run.
 *
 * The admin console signs in by resolving the number to the account via Auth's
 * `phoneNumber` (unique per project); the password stays the account's existing
 * e-mail/password credential. Only allow-listed Super Admin e-mails are accepted.
 *
 * Usage:
 *   npm run admin:set-phone -- ashokkumarmoharana05@gmail.com 9876543210
 *
 * (`npm run admin:set-phone` loads .env.local via dotenv-cli — see package.json.)
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

/** Same rules as src/server/referral/resolve.ts `normalizePhone`. */
function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return null;
}

function superAdminAllowlist(): Set<string> {
  const raw = (process.env.SUPER_ADMIN_ALLOWLIST ?? process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? "").trim();
  return new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean));
}

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "amaashop-dev";

  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    initializeApp({ projectId });
    return;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error("No Auth target: set FIREBASE_AUTH_EMULATOR_HOST (emulator) or FIREBASE_SERVICE_ACCOUNT_JSON (real project) in .env.local.");
  }
  const svc = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
  initializeApp({
    credential: cert({ projectId: svc.project_id, clientEmail: svc.client_email, privateKey: svc.private_key.replace(/\\n/g, "\n") }),
    projectId: svc.project_id,
  });
}

async function main() {
  const [emailArg, phoneArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!emailArg || !phoneArg) {
    throw new Error("Usage:  npm run admin:set-phone -- <admin-email> <10-digit-mobile>");
  }

  const email = emailArg.trim().toLowerCase();
  const phone10 = normalizePhone(phoneArg);
  if (!phone10) throw new Error(`"${phoneArg}" is not a valid 10-digit Indian mobile number.`);
  const e164 = `+91${phone10}`;

  if (!superAdminAllowlist().has(email)) {
    throw new Error(`${email} is not on SUPER_ADMIN_ALLOWLIST — refusing to attach a console phone number.`);
  }

  initAdmin();
  const auth = getAuth();

  const user = await auth.getUserByEmail(email);
  if (!user.emailVerified) {
    throw new Error(`${email} has an unverified e-mail; the console rejects unverified accounts.`);
  }

  // Auth enforces phone uniqueness — a distributor already using this number
  // would collide. Say so plainly instead of surfacing the raw SDK error.
  try {
    const owner = await auth.getUserByPhoneNumber(e164);
    if (owner.uid !== user.uid) {
      throw new Error(`${e164} already belongs to another account (${owner.email ?? owner.uid}). Use a different number.`);
    }
  } catch (err) {
    if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
  }

  const before = user.phoneNumber ?? null;
  await auth.updateUser(user.uid, { phoneNumber: e164 });

  await getFirestore().collection("audit_logs").add({
    actorUserId: null, // provisioned out-of-band via CLI
    action: "super_admin.set_phone",
    entity: "app_user",
    entityId: user.uid,
    before: { phone: before },
    after: { phone: e164, method: "scripts/set-admin-phone.ts" },
    ip: null,
    userAgent: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log("\n  Admin phone set");
  console.log("  ─────────────────────────────────────────────");
  console.log(`  email  ${email}`);
  console.log(`  uid    ${user.uid}`);
  console.log(`  phone  ${e164}${before && before !== e164 ? `   (was ${before})` : ""}`);
  console.log("\n  Sign in at  " + (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") + "/admin/signin  with this number + the account's password.\n");
}

main().catch((e) => {
  console.error("\n  set-admin-phone failed:\n  " + (e instanceof Error ? e.message : String(e)) + "\n");
  process.exit(1);
});
