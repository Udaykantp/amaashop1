/**
 * Provision (or re-sync) a Super Admin — idempotent, safe to re-run.
 *
 * Runs against whatever the environment points at: the local Firebase Auth
 * emulator (FIREBASE_AUTH_EMULATOR_HOST set) or the real project (via
 * FIREBASE_SERVICE_ACCOUNT_JSON). It:
 *
 *   1. verifies the e-mail is on SUPER_ADMIN_ALLOWLIST  (refuses otherwise)
 *   2. creates / updates the Firebase Auth user
 *   3. sets custom claims  { role: "SUPER_ADMIN", mfa: true }
 *   4. upserts the matching app_users document  (role SUPER_ADMIN, status ACTIVE)
 *   5. writes an append-only audit_logs entry  ("super_admin.provision")
 *   6. establishes a credential:
 *        --password=...   set this exact password
 *        --send-reset     print a one-time password-reset link (real project)
 *        (default)        emulator -> a dev password;  real -> a reset link
 *
 * Usage:
 *   npm run admin:create -- ashokkumarmoharana05@gmail.com --name "Ashok Kumar Moharana"
 *   npm run admin:create -- ashokkumarmoharana05@gmail.com --password 'S0me-Strong-Pass!'
 *   npm run admin:create -- ashokkumarmoharana05@gmail.com --send-reset
 *
 * (`npm run admin:create` loads .env.local via dotenv-cli — see package.json.)
 */
import { randomBytes } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// ── args ───────────────────────────────────────────────────────────────────

interface Args {
  email: string;
  name: string;
  password?: string;
  sendReset: boolean;
}

function parseArgs(argv: string[]): Args {
  const positionals: string[] = [];
  let name = "Super Admin";
  let password: string | undefined;
  let sendReset = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--send-reset") sendReset = true;
    else if (a === "--name") name = argv[++i] ?? name;
    else if (a.startsWith("--name=")) name = a.slice("--name=".length);
    else if (a === "--password") password = argv[++i];
    else if (a.startsWith("--password=")) password = a.slice("--password=".length);
    else if (!a.startsWith("--")) positionals.push(a);
  }

  const email = (positionals[0] || process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL || "").trim();
  return { email, name, password, sendReset };
}

// ── allow-list (kept in sync with src/server/auth/super-admin.ts) ───────────

function superAdminAllowlist(): Set<string> {
  const raw = (process.env.SUPER_ADMIN_ALLOWLIST ?? process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? "").trim();
  return new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean));
}

// ── firebase admin bootstrap (mirrors scripts/seed-base.ts) ─────────────────

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

const usingEmulator = () => Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.email) {
    throw new Error("Provide the Super Admin e-mail:  npm run admin:create -- <email>");
  }

  const allow = superAdminAllowlist();
  if (allow.size === 0) {
    throw new Error(`SUPER_ADMIN_ALLOWLIST is empty. Set it in .env.local, e.g.\n  SUPER_ADMIN_ALLOWLIST=${args.email}`);
  }
  if (!allow.has(args.email.toLowerCase())) {
    throw new Error(
      `${args.email} is not on SUPER_ADMIN_ALLOWLIST.\n` + `Add it there first:  SUPER_ADMIN_ALLOWLIST=${[...allow, args.email].join(",")}`,
    );
  }

  initAdmin();
  const auth = getAuth();
  const db = getFirestore();

  // 1 + 2 — Firebase Auth user
  const password = args.password ?? (usingEmulator() ? "Admin@12345" : undefined);
  let uid: string;
  let created = false;
  try {
    const existing = await auth.getUserByEmail(args.email);
    uid = existing.uid;
    await auth.updateUser(uid, { displayName: args.name, emailVerified: true, ...(password ? { password } : {}) });
  } catch {
    const rec = await auth.createUser({
      email: args.email,
      displayName: args.name,
      emailVerified: true,
      password: password ?? randomBytes(24).toString("base64url"),
    });
    uid = rec.uid;
    created = true;
  }

  // 3 — custom claims: role + mandatory 2FA flag
  await auth.setCustomUserClaims(uid, { role: "SUPER_ADMIN", mfa: true });
  await auth.revokeRefreshTokens(uid); // force any old session to re-mint claims

  // 4 — app_users document
  const userRef = db.collection("app_users").doc(uid);
  const beforeSnap = await userRef.get();
  const beforeRow = beforeSnap.exists ? { role: beforeSnap.get("role"), status: beforeSnap.get("status"), email: beforeSnap.get("email") } : null;
  await userRef.set(
    {
      email: args.email,
      displayName: args.name,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      extraCapabilities: beforeSnap.exists ? beforeSnap.get("extraCapabilities") : [],
      deniedCapabilities: beforeSnap.exists ? beforeSnap.get("deniedCapabilities") : [],
      memberProfileId: beforeSnap.exists ? beforeSnap.get("memberProfileId") : null,
      phone: beforeSnap.exists ? beforeSnap.get("phone") : null,
      createdAt: beforeSnap.exists ? beforeSnap.get("createdAt") : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  // 5 — audit trail
  await db.collection("audit_logs").add({
    actorUserId: null, // provisioned out-of-band via CLI
    action: "super_admin.provision",
    entity: "app_user",
    entityId: uid,
    before: beforeRow,
    after: { email: args.email, role: "SUPER_ADMIN", mfa: true, method: "scripts/create-super-admin.ts", firebaseUserCreated: created },
    ip: null,
    userAgent: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  // 6 — credential handoff
  let resetLink: string | null = null;
  const wantReset = args.sendReset || (!password && !usingEmulator());
  if (wantReset) {
    resetLink = await auth.generatePasswordResetLink(args.email);
  }

  // ── report ──────────────────────────────────────────────────────────────
  console.log("\n  Super Admin provisioned");
  console.log("  ─────────────────────────────────────────────");
  console.log(`  email     ${args.email}`);
  console.log(`  name      ${args.name}`);
  console.log(`  uid       ${uid}`);
  console.log(`  role      SUPER_ADMIN   (claims: role, mfa=true)`);
  console.log(`  status    ACTIVE`);
  console.log(`  auth user ${created ? "created" : "updated"}`);
  console.log(`  target    ${usingEmulator() ? "Firebase Auth emulator" : "real Firebase project"}`);
  if (password) {
    console.log(`  password  ${password}`);
    if (!usingEmulator()) console.log("            ^ share over a secure channel, then rotate");
  }
  if (resetLink) {
    console.log("\n  Password-reset link (one-time, expires):");
    console.log(`  ${resetLink}`);
  }
  console.log("\n  Sign in at  " + (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") + "/admin/signin\n");
}

main().catch((e) => {
  console.error("\n  create-super-admin failed:\n  " + (e instanceof Error ? e.message : String(e)) + "\n");
  process.exit(1);
});
