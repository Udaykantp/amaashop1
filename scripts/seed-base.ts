/**
 * Seed — production-safe reference data, plus optional local dev accounts.
 * Idempotent: safe to re-run. (Replaces the old `prisma/seed.ts`.)
 *
 * ALWAYS (any environment):
 *   1. primary Site, base product categories, the initial ACTIVE CommissionRuleSet
 *
 * ONLY when SEED_DEMO=true, or the Firebase Auth emulator is in use:
 *   2. Firebase Auth users (Super Admin, Network/Finance/Store/Support admins,
 *      a demo sponsor + downline) + app_users rows, custom claims, wallets
 *   3. a demo genealogy: AMA-ROOT01 with three Level-1 and two Level-2 members
 *
 *   Run (local, with emulator): npm run db:seed
 *   Run (production reference only): npm run db:seed:prod
 *
 * The demo block is gated so a production seed never creates @amaashop.local
 * users or a fake network, even though FIREBASE_SERVICE_ACCOUNT_JSON is set.
 */
import { randomInt } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";

type UserRole = "SUPER_ADMIN" | "OPS_ADMIN" | "FINANCE_ADMIN" | "STORE_MANAGER" | "SUPPORT_COMPLIANCE" | "MEMBER" | "CONSUMER";

function initAdmin(): Firestore {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "amaashop-dev";
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      initializeApp({ projectId });
    } else {
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON as string) as {
        project_id: string;
        client_email: string;
        private_key: string;
      };
      initializeApp({
        credential: cert({ projectId: svc.project_id, clientEmail: svc.client_email, privateKey: svc.private_key.replace(/\\n/g, "\n") }),
        projectId: svc.project_id,
      });
    }
  }
  return getFirestore();
}

const db = initAdmin();

// ── reference data ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: "Beverages", slug: "beverages", iconKey: "cup-soda", sortOrder: 1 },
  { name: "Home Care", slug: "home-care", iconKey: "spray-can", sortOrder: 2 },
  { name: "Personal Care", slug: "personal-care", iconKey: "sparkles", sortOrder: 3 },
  { name: "Devotional", slug: "devotional", iconKey: "flame", sortOrder: 4 },
];

const INITIAL_RULE_JSON = {
  networkDepth: 20,
  joiningPackagePriceRs: "700.00",
  trustContributionRs: "10.00",
  placementStrategy: "BINARY",
  levelIncome: [
    { levelFrom: 0, levelTo: 0, amountRs: "400.00" },
    { levelFrom: 1, levelTo: 4, amountRs: "25.00" },
    { levelFrom: 5, levelTo: 8, amountRs: "20.00" },
    { levelFrom: 9, levelTo: 12, amountRs: "15.00" },
    { levelFrom: 13, levelTo: 16, amountRs: "7.50" },
    { levelFrom: 17, levelTo: 20, amountRs: "5.00" },
  ],
  repurchase: {
    poolBps: 1000,
    decaySplits: [5000, 2500, 1250, 625],
    x5Interpretation: "QUALIFYING_LEVELS",
    tailSplitAcross: 5,
  },
  qualification: { minPersonalPurchaseRs: "0.00", minDirectReferrals: 0, holdPeriodDays: 0 },
  breakagePolicy: "FORFEIT",
  trust: {
    flatPerJoiningRs: "10.00",
    repurchaseCsrBps: 0,
    note: "32% for Temple / 20 Level — meaning unresolved",
  },
};

const CONFIRM_PENDING = {
  joiningPackagePriceRs: "verify Rs 700 = Rs 690 level income + Rs 10 trust",
  "levelIncome.level11": "handwritten as Rs 18, seeded as Rs 15",
  "repurchase.poolBps": "assumed 10%",
  "repurchase.x5Interpretation": "QUALIFYING_LEVELS vs MEMBERS_REQUIRED_TO_UNLOCK",
  qualification: "'Payment after 6' - joins / days / months / units?",
  breakagePolicy: "FORFEIT vs ROLL_UP vs ESCROW",
  "trust.repurchaseCsrBps": "'32% for Temple' against '20 Level' - meaning?",
};

// ── dev accounts ───────────────────────────────────────────────────────────

interface SeedUser {
  key: string;
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  mfa?: boolean;
  phone?: string;
  /**
   * `sponsorKey` = who referred them. `parentKey` + `leg` = where they sit in the
   * binary tree (defaults to directly under the sponsor) — they differ when the
   * sponsor's own two slots were already full and the member spilled over.
   */
  member?: { memberCode: string; sponsorKey?: string; parentKey?: string; leg?: "LEFT" | "RIGHT" };
}

const SUPER_ADMIN_EMAIL = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim() || "ashokkumarmoharana05@gmail.com";

const SEED_USERS: SeedUser[] = [
  { key: "super", email: SUPER_ADMIN_EMAIL, password: "Admin@12345", displayName: "Ashok Kumar Moharana", role: "SUPER_ADMIN", mfa: true },
  { key: "network", email: "network@amaashop.local", password: "Network@12345", displayName: "Network Admin", role: "OPS_ADMIN", mfa: true },
  { key: "finance", email: "finance@amaashop.local", password: "Finance@12345", displayName: "Finance / Payout Manager", role: "FINANCE_ADMIN", mfa: true },
  { key: "store", email: "store@amaashop.local", password: "Store@12345", displayName: "Catalog / Store Manager", role: "STORE_MANAGER", mfa: true },
  { key: "support", email: "support@amaashop.local", password: "Support@12345", displayName: "Support / Compliance", role: "SUPPORT_COMPLIANCE", mfa: true },
  { key: "sponsor", email: "sponsor@amaashop.local", password: "Sponsor@12345", displayName: "Ramesh Verma", role: "MEMBER", phone: "9000000001", member: { memberCode: "AMA-ROOT01" } },
  { key: "m1", email: "priya@amaashop.local", password: "Member@12345", displayName: "Priya Sharma", role: "MEMBER", phone: "9000000002", member: { memberCode: "AMA-PRIYA1", sponsorKey: "sponsor", leg: "LEFT" } },
  { key: "m2", email: "ravi@amaashop.local", password: "Member@12345", displayName: "Ravi Kumar", role: "MEMBER", phone: "9000000003", member: { memberCode: "AMA-RAVIK1", sponsorKey: "sponsor", leg: "RIGHT" } },
  { key: "m3", email: "anjali@amaashop.local", password: "Member@12345", displayName: "Anjali Mehta", role: "MEMBER", phone: "9000000004", member: { memberCode: "AMA-ANJAL1", sponsorKey: "sponsor", parentKey: "m2", leg: "LEFT" } },
  { key: "m4", email: "sunil@amaashop.local", password: "Member@12345", displayName: "Sunil Patel", role: "MEMBER", phone: "9000000005", member: { memberCode: "AMA-SUNIL1", sponsorKey: "m1", leg: "LEFT" } },
  { key: "m5", email: "deepa@amaashop.local", password: "Member@12345", displayName: "Deepa Rao", role: "MEMBER", phone: "9000000006", member: { memberCode: "AMA-DEEPA1", sponsorKey: "m1", leg: "RIGHT" } },
];

function authAvailable(): boolean {
  return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

function seedDemoData(): boolean {
  return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) || process.env.SEED_DEMO === "true";
}

/** Create or fetch the Firebase Auth user, return its uid. */
async function ensureAuthUser(u: SeedUser): Promise<string> {
  const auth = getAuth();
  let uid: string;
  try {
    const existing: UserRecord = await auth.getUserByEmail(u.email);
    uid = existing.uid;
    await auth.updateUser(uid, { password: u.password, displayName: u.displayName, emailVerified: true });
  } catch {
    const created = await auth.createUser({ email: u.email, password: u.password, displayName: u.displayName, emailVerified: true });
    uid = created.uid;
  }
  await auth.setCustomUserClaims(uid, { role: u.role, mfa: Boolean(u.mfa) });
  return uid;
}

// ── genealogy (inline — mirrors src/server/network/genealogy.ts) ────────────

async function ensureMember(
  uid: string,
  memberCode: string,
  sponsorProfileId: string | null,
  parentProfileId: string | null,
  leg: "LEFT" | "RIGHT" | null,
): Promise<string> {
  const existingSnap = await db.collection("member_profiles").where("userId", "==", uid).limit(1).get();
  if (!existingSnap.empty) return existingSnap.docs[0]!.id;

  const now = Timestamp.now();
  const profileRef = db.collection("member_profiles").doc();
  await profileRef.set({
    userId: uid,
    memberCode,
    sponsorId: sponsorProfileId,
    placementParentId: parentProfileId,
    leg,
    placementStrategy: "BINARY",
    status: "ACTIVE",
    joinedAt: now,
    joiningOrderId: null,
    frozenAt: null,
    frozenReason: null,
    terminatedAt: null,
    compressedIntoId: null,
    lastMovedAt: null,
    lastMovedFromId: null,
  });

  const rows: { ancestorId: string; descendantId: string; depth: number; descendantJoinedAt: Timestamp }[] = [
    { ancestorId: profileRef.id, descendantId: profileRef.id, depth: 0, descendantJoinedAt: now },
  ];
  if (parentProfileId) {
    const parentAncestors = await db.collection("network_closure").where("descendantId", "==", parentProfileId).get();
    for (const d of parentAncestors.docs) {
      const e = d.data() as { ancestorId: string; depth: number };
      rows.push({ ancestorId: e.ancestorId, descendantId: profileRef.id, depth: e.depth + 1, descendantJoinedAt: now });
    }
  }
  const batch = db.batch();
  for (const row of rows) batch.set(db.collection("network_closure").doc(`${row.ancestorId}_${row.descendantId}`), row);
  await batch.commit();

  await db.collection("app_users").doc(uid).update({ memberProfileId: profileRef.id, role: "MEMBER" });
  return profileRef.id;
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const siteDomain = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/^https?:\/\//, "").replace(/\/$/, "");

  const siteSnap = await db.collection("sites").where("domain", "==", siteDomain).limit(1).get();
  if (siteSnap.empty) {
    await db.collection("sites").add({ name: "AmaaShop", domain: siteDomain, isPrimary: true, createdAt: FieldValue.serverTimestamp() });
    console.log(`site: AmaaShop (${siteDomain}) created`);
  } else {
    await siteSnap.docs[0]!.ref.update({ isPrimary: true });
    console.log(`site: AmaaShop (${siteDomain}) ensured`);
  }

  // Non-destructive: create the base categories if absent, but never overwrite
  // ones already curated by scripts/seed-catalog.ts (the catalog authority).
  for (const c of CATEGORIES) {
    const ref = db.collection("categories").doc(c.slug);
    const existing = await ref.get();
    if (!existing.exists) await ref.set({ name: c.name, slug: c.slug, iconKey: c.iconKey, sortOrder: c.sortOrder });
  }
  console.log(`categories: ${CATEGORIES.length} ensured`);

  const activeRuleSetSnap = await db.collection("commission_rule_sets").where("status", "==", "ACTIVE").limit(1).get();
  if (activeRuleSetSnap.empty) {
    await db.collection("commission_rule_sets").add({
      name: "Launch plan (documented, pending founder confirmation)",
      status: "ACTIVE",
      effectiveFrom: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
      effectiveTo: null,
      ruleJson: INITIAL_RULE_JSON,
      confirmPending: CONFIRM_PENDING,
      createdByUserId: null,
      note: "Seeded from docs/COMMISSION-PLAN.md. Do not enable repurchase payouts until confirmed.",
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log("commissionRuleSet: initial ACTIVE set created");
  } else {
    console.log("commissionRuleSet: already present");
  }

  if (!seedDemoData()) {
    console.log("\n✓ Reference data seeded. Demo accounts / network skipped");
    console.log("  (not local dev, and SEED_DEMO=true was not set).");
    return;
  }
  if (!authAvailable()) {
    console.log("\n! SEED_DEMO requested but no Firebase Auth target is reachable.");
    console.log("  Start the emulator (npm run emulators) or set FIREBASE_SERVICE_ACCOUNT_JSON, then re-run.");
    return;
  }

  const uidByKey: Record<string, string> = {};

  for (const u of SEED_USERS) {
    const uid = await ensureAuthUser(u);
    uidByKey[u.key] = uid;
    const ref = db.collection("app_users").doc(uid);
    const existing = await ref.get();
    await ref.set(
      {
        email: u.email,
        phone: u.phone ?? null,
        displayName: u.displayName,
        role: u.role,
        status: "ACTIVE",
        extraCapabilities: existing.exists ? existing.get("extraCapabilities") : [],
        deniedCapabilities: existing.exists ? existing.get("deniedCapabilities") : [],
        memberProfileId: existing.exists ? existing.get("memberProfileId") : null,
        createdAt: existing.exists ? existing.get("createdAt") : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    if (u.role === "MEMBER") {
      const walletRef = db.collection("wallets").doc(uid);
      if (!(await walletRef.get()).exists) {
        await walletRef.set({ userId: uid, balanceCache: "0.00", settledBalance: "0.00", updatedAt: FieldValue.serverTimestamp() });
      }
    }
  }
  console.log(`accounts: ${SEED_USERS.length} Firebase users + app_users rows`);

  // demo genealogy, sponsors before their downline
  const profileByKey: Record<string, string> = {};
  const ordered = SEED_USERS.filter((u) => u.member);
  for (const u of ordered) {
    const sponsorKey = u.member!.sponsorKey;
    const sponsorProfileId = sponsorKey ? (profileByKey[sponsorKey] ?? null) : null;
    const parentKey = u.member!.parentKey ?? sponsorKey;
    const parentProfileId = parentKey ? (profileByKey[parentKey] ?? null) : null;
    profileByKey[u.key] = await ensureMember(
      uidByKey[u.key]!,
      u.member!.memberCode,
      sponsorProfileId,
      parentProfileId,
      parentProfileId ? (u.member!.leg ?? "LEFT") : null,
    );
  }
  console.log(`demo network: ${ordered.length} members under AMA-ROOT01`);

  console.log("\n─────────────────────────────────────────────");
  console.log(" Local dev sign-in (Firebase Auth emulator)");
  console.log("─────────────────────────────────────────────");
  for (const u of SEED_USERS) {
    console.log(`  ${u.role.padEnd(13)}  ${u.email.padEnd(24)}  ${u.password}`);
  }
  console.log("\n  Admin panel : http://localhost:3000/admin");
  console.log("  Member portal: http://localhost:3000/member  (sign in as sponsor@ or a member@)\n");
  void randomInt; // reserved for future randomised demo data
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
