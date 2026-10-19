/**
 * Make the signed-in founder account a distributor (root of the tree) and give
 * it a small demo downline + wallet history, so the /office back-office renders
 * with real data. Idempotent.
 *
 *   npm run office:seed -- <founder-email>
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore, type Firestore } from "firebase-admin/firestore";

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

async function ensureClosureSelf(id: string, joinedAt: Timestamp) {
  await db.collection("network_closure").doc(`${id}_${id}`).set({ ancestorId: id, descendantId: id, depth: 0, descendantJoinedAt: joinedAt }, { merge: true });
}

async function ensureChild(parentId: string, childId: string, joinedAt: Timestamp) {
  await ensureClosureSelf(childId, joinedAt);
  const parentAnc = await db.collection("network_closure").where("descendantId", "==", parentId).get();
  const batch = db.batch();
  for (const d of parentAnc.docs) {
    const e = d.data() as { ancestorId: string; depth: number };
    batch.set(
      db.collection("network_closure").doc(`${e.ancestorId}_${childId}`),
      { ancestorId: e.ancestorId, descendantId: childId, depth: e.depth + 1, descendantJoinedAt: joinedAt },
      { merge: true },
    );
  }
  await batch.commit();
}

async function main() {
  const email = (process.argv[2] || process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run office:seed -- <email>");

  const founderSnap = await db.collection("app_users").where("email", "==", email).limit(1).get();
  if (founderSnap.empty) throw new Error(`No app_users row for ${email} — sign in once first.`);
  const founderId = founderSnap.docs[0]!.id;

  const ruleSetSnap = await db.collection("commission_rule_sets").where("status", "==", "ACTIVE").limit(1).get();
  if (ruleSetSnap.empty) throw new Error("No ACTIVE CommissionRuleSet — run `npm run db:seed` first.");
  const ruleSetId = ruleSetSnap.docs[0]!.id;

  // 1. founder → root distributor
  const now = Timestamp.now();
  let rootId: string;
  let rootCode: string;
  const rootSnap = await db.collection("member_profiles").where("userId", "==", founderId).limit(1).get();
  if (rootSnap.empty) {
    const rootRef = db.collection("member_profiles").doc();
    rootId = rootRef.id;
    rootCode = "AMA-FOUNDER";
    await rootRef.set({
      userId: founderId,
      memberCode: rootCode,
      sponsorId: null,
      placementParentId: null,
      leg: null,
      status: "ACTIVE",
      placementStrategy: "BINARY",
      joinedAt: now,
      joiningOrderId: null,
      frozenAt: null,
      frozenReason: null,
      terminatedAt: null,
      compressedIntoId: null,
      lastMovedAt: null,
      lastMovedFromId: null,
    });
    await ensureClosureSelf(rootId, now);
    await db.collection("app_users").doc(founderId).update({ memberProfileId: rootId, role: "MEMBER" });
    console.log("root distributor created:", rootCode);
  } else {
    rootId = rootSnap.docs[0]!.id;
    rootCode = (rootSnap.docs[0]!.data() as { memberCode: string }).memberCode;
    await rootSnap.docs[0]!.ref.update({ status: "ACTIVE" });
    console.log("root distributor already present:", rootCode);
  }

  // 2. wallet with a demo balance
  await db.collection("wallets").doc(founderId).set(
    { userId: founderId, balanceCache: "4820.50", settledBalance: "3600.00", updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  // 3. demo downline (data-only members) — unique codes to avoid colliding with
  // any earlier emulator seed run.
  const DEMO = [
    { uid: "demo-dist-a", code: "AMA-DEMOA1", name: "Priya Sharma", under: "root" as const, leg: "LEFT" as const },
    { uid: "demo-dist-b", code: "AMA-DEMOB2", name: "Ravi Kumar", under: "root" as const, leg: "RIGHT" as const },
    { uid: "demo-dist-c", code: "AMA-DEMOC3", name: "Sunil Patel", under: "AMA-DEMOA1" as const, leg: "LEFT" as const },
  ];
  const profByCode: Record<string, string> = {};
  for (const d of DEMO) {
    const userRef = db.collection("app_users").doc(d.uid);
    const existingUser = await userRef.get();
    await userRef.set(
      {
        email: `${d.uid}@demo.amaashop`,
        displayName: d.name,
        role: "MEMBER",
        status: "ACTIVE",
        phone: null,
        extraCapabilities: [],
        deniedCapabilities: [],
        memberProfileId: existingUser.exists ? existingUser.get("memberProfileId") : null,
        createdAt: existingUser.exists ? existingUser.get("createdAt") : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const parentId = d.under === "root" ? rootId : (profByCode[d.under] ?? rootId);
    let profileId: string;
    const byUserSnap = await db.collection("member_profiles").where("userId", "==", d.uid).limit(1).get();
    const byCodeSnap = byUserSnap.empty ? await db.collection("member_profiles").where("memberCode", "==", d.code).limit(1).get() : byUserSnap;
    if (!byCodeSnap.empty) {
      profileId = byCodeSnap.docs[0]!.id;
    } else {
      const ref = db.collection("member_profiles").doc();
      profileId = ref.id;
      await ref.set({
        userId: d.uid,
        memberCode: d.code,
        sponsorId: parentId,
        placementParentId: parentId,
        leg: d.leg,
        status: "ACTIVE",
        placementStrategy: "BINARY",
        joinedAt: now,
        joiningOrderId: null,
        frozenAt: null,
        frozenReason: null,
        terminatedAt: null,
        compressedIntoId: null,
        lastMovedAt: null,
        lastMovedFromId: null,
      });
    }
    await userRef.update({ memberProfileId: profileId });
    await ensureChild(parentId, profileId, now);
    profByCode[d.code] = profileId;
    const walletRef = db.collection("wallets").doc(d.uid);
    if (!(await walletRef.get()).exists) {
      await walletRef.set({ userId: d.uid, balanceCache: "0.00", settledBalance: "0.00", updatedAt: FieldValue.serverTimestamp() });
    }
  }

  // 4. a demo source order + a few POSTED commission entries for the root
  const orderSnap = await db.collection("orders").where("orderNo", "==", "AMA-DEMO-0001").limit(1).get();
  let demoOrderId: string;
  if (orderSnap.empty) {
    const ref = db.collection("orders").doc();
    demoOrderId = ref.id;
    await ref.set({
      orderNo: "AMA-DEMO-0001",
      userId: null,
      placedByMemberId: null,
      type: "JOINING",
      status: "CONFIRMED",
      siteId: null,
      subtotal: "700.00",
      discount: "0.00",
      shipping: "0.00",
      tax: "0.00",
      total: "700.00",
      walletApplied: "0.00",
      customerName: "Demo Joiner",
      customerEmail: "demo-joiner@demo.amaashop",
      customerPhone: null,
      shippingAddress: { line1: "Demo", city: "Demo", state: "KA", pincode: "560001" },
      buyerStateCode: "KA",
      createdAt: FieldValue.serverTimestamp(),
      confirmedAt: FieldValue.serverTimestamp(),
      cancelledAt: null,
    });
  } else {
    demoOrderId = orderSnap.docs[0]!.id;
  }

  const entries = [
    { type: "JOINING_LEVEL_INCOME", level: 0, amount: 400, src: profByCode["AMA-DEMOA1"] },
    { type: "JOINING_LEVEL_INCOME", level: 0, amount: 400, src: profByCode["AMA-DEMOB2"] },
    { type: "JOINING_LEVEL_INCOME", level: 1, amount: 25, src: profByCode["AMA-DEMOC3"] },
  ] as const;
  for (const [i, e] of entries.entries()) {
    const key = `demo-seed:${e.type}:${rootId}:${e.level}:${i}`;
    const existing = await db.collection("commission_ledger_entries").where("idempotencyKey", "==", key).limit(1).get();
    if (!existing.empty) continue;
    await db.collection("commission_ledger_entries").add({
      beneficiaryId: rootId,
      sourceMemberId: e.src ?? null,
      sourceOrderId: demoOrderId,
      ruleSetId,
      level: e.level,
      type: e.type,
      amount: e.amount.toFixed(2),
      status: "POSTED",
      idempotencyKey: key,
      reversalOfId: null,
      heldReason: null,
      runId: null,
      createdAt: Timestamp.fromMillis(Date.now() - i * 86400000),
      postedAt: Timestamp.fromMillis(Date.now() - i * 86400000),
    });
  }

  // 5. matching wallet transactions
  const txCountSnap = await db.collection("wallet_transactions").where("walletId", "==", founderId).count().get();
  if (txCountSnap.data().count === 0) {
    let bal = 0;
    for (const [i, e] of entries.entries()) {
      bal += e.amount;
      await db.collection("wallet_transactions").add({
        walletId: founderId,
        ledgerEntryId: null,
        payoutItemId: null,
        type: "CREDIT_COMMISSION",
        amount: e.amount.toFixed(2),
        balanceAfter: bal.toFixed(2),
        note: `${e.type.replace(/_/g, " ").toLowerCase()} (L${e.level})`,
        createdAt: Timestamp.fromMillis(Date.now() - i * 86400000),
      });
    }
  }

  console.log("\n✓ /office is ready. Sign in as", email, "→ http://localhost:3000/office");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
