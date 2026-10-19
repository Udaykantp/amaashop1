/**
 * Exercises the manual node-move closure rewrite against the live demo network,
 * then reverses it. Mirrors src/server/network/move.ts:moveMemberSubtree.
 */
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "amaashop-dev";
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    initializeApp({ projectId });
  } else {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({
      credential: cert({ projectId: svc.project_id, clientEmail: svc.client_email, privateKey: svc.private_key.replace(/\\n/g, "\n") }),
      projectId: svc.project_id,
    });
  }
}
initAdmin();
const db = getFirestore();

async function move(memberId, newParentId, leg) {
  const subtreeSnap = await db.collection("network_closure").where("ancestorId", "==", memberId).get();
  const subtree = subtreeSnap.docs.map((d) => ({ descendantId: d.get("descendantId"), depth: d.get("depth") }));
  const ids = new Set(subtree.map((s) => s.descendantId));

  const toDelete = [];
  for (const id of ids) {
    const incoming = await db.collection("network_closure").where("descendantId", "==", id).get();
    for (const d of incoming.docs) if (!ids.has(d.get("ancestorId"))) toDelete.push(d.ref);
  }

  const newAnc = (await db.collection("network_closure").where("descendantId", "==", newParentId).get()).docs.map((d) => ({
    ancestorId: d.get("ancestorId"),
    depth: d.get("depth"),
  }));

  const batch = db.batch();
  for (const ref of toDelete) batch.delete(ref);
  const now = new Date();
  for (const s of subtree) {
    for (const a of newAnc) {
      batch.set(db.collection("network_closure").doc(`${a.ancestorId}_${s.descendantId}`), {
        ancestorId: a.ancestorId,
        descendantId: s.descendantId,
        depth: a.depth + 1 + s.depth,
        descendantJoinedAt: now,
      });
    }
  }
  batch.update(db.collection("member_profiles").doc(memberId), { placementParentId: newParentId, leg });
  await batch.commit();
}

async function integrity(label) {
  const membersSnap = await db.collection("member_profiles").get();
  const members = membersSnap.docs.map((d) => ({ id: d.id, memberCode: d.get("memberCode"), parentId: d.get("placementParentId") ?? null }));
  const byId = new Map(members.map((m) => [m.id, m]));
  const closureSnap = await db.collection("network_closure").get();
  const closure = closureSnap.docs.map((d) => ({ ancestorId: d.get("ancestorId"), descendantId: d.get("descendantId"), depth: d.get("depth") }));
  let ok = true;
  for (const m of members) {
    const expected = new Map([[m.id, 0]]);
    let cur = m.parentId,
      d = 1;
    while (cur) {
      expected.set(cur, d);
      cur = byId.get(cur)?.parentId ?? null;
      d++;
    }
    const actual = new Map(closure.filter((c) => c.descendantId === m.id).map((c) => [c.ancestorId, c.depth]));
    const same = expected.size === actual.size && [...expected].every(([k, v]) => actual.get(k) === v);
    if (!same) {
      ok = false;
      console.log(`   ✗ ${m.memberCode}: exp ${JSON.stringify([...expected])} got ${JSON.stringify([...actual])}`);
    }
  }
  console.log(`${ok ? "✓" : "✗"} ${label}: closure matches placement chains for all ${members.length} members`);
  return ok;
}

async function findByCode(code) {
  const snap = await db.collection("member_profiles").where("memberCode", "==", code).limit(1).get();
  if (snap.empty) throw new Error(`member ${code} not found — run npm run db:seed first`);
  return { id: snap.docs[0].id, parentId: snap.docs[0].get("placementParentId") ?? null, leg: snap.docs[0].get("leg") ?? null };
}

// ANJAL1 sits under RAVIK1 (left). SUNIL1 is a leaf with both slots open.
const anjali = await findByCode("AMA-ANJAL1");
const sunil = await findByCode("AMA-SUNIL1");
const origParent = anjali.parentId;
const origLeg = anjali.leg;

console.log("baseline");
await integrity("baseline");

console.log("\nmove: anjali -> under sunil (left)");
await move(anjali.id, sunil.id, "LEFT");
const okA = await integrity("after move under sunil");
const edgesSnap = await db.collection("network_closure").where("descendantId", "==", anjali.id).orderBy("depth", "asc").get();
console.log(`   anjali now has ${edgesSnap.size} ancestor edges, depths ${edgesSnap.docs.map((d) => d.get("depth")).join(",")}`);

console.log("\nreverse: anjali -> back under her original parent");
await move(anjali.id, origParent, origLeg);
const okB = await integrity("after reverse");

process.exit(okA && okB ? 0 : 1);
