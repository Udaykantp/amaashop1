/** Closure-table + binary-tree integrity checks on the seeded demo network (Firestore). */
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

const membersSnap = await db.collection("member_profiles").get();
// terminated members are deliberately out of the tree (no closure edges) — check the live network only
const members = membersSnap.docs.filter((d) => !d.get("terminatedAt")).map((d) => ({
  id: d.id,
  memberCode: d.get("memberCode"),
  sponsorId: d.get("sponsorId"),
  parentId: d.get("placementParentId") ?? null,
  leg: d.get("leg") ?? null,
  strategy: d.get("placementStrategy"),
}));
const byId = new Map(members.map((m) => [m.id, m]));
const closureSnap = await db.collection("network_closure").get();
const closure = closureSnap.docs.map((d) => ({ ancestorId: d.get("ancestorId"), descendantId: d.get("descendantId"), depth: d.get("depth") }));

const check = (name, cond, extra = "") => console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`);

// every member has a self edge at depth 0
const selfEdges = closure.filter((c) => c.ancestorId === c.descendantId && c.depth === 0);
check("one self-edge (depth 0) per member", selfEdges.length === members.length, `${selfEdges.length}/${members.length}`);

// no edge with ancestor == descendant and depth != 0
check("no bogus self-edges", !closure.some((c) => c.ancestorId === c.descendantId && c.depth !== 0));

check("every member is on the binary plan", members.every((m) => m.strategy === "BINARY"));

// binary shape: at most one member per (parent, leg) slot, a leg on every non-root member
const slots = new Map();
let shapeOk = true;
for (const m of members) {
  if (!m.parentId) continue;
  const key = `${m.parentId}:${m.leg}`;
  if (m.leg !== "LEFT" && m.leg !== "RIGHT") {
    shapeOk = false;
    console.log(`   ${m.memberCode} has no leg`);
  } else if (slots.has(key)) {
    shapeOk = false;
    console.log(`   slot ${byId.get(m.parentId)?.memberCode} ${m.leg} holds both ${slots.get(key)} and ${m.memberCode}`);
  } else slots.set(key, m.memberCode);
}
check("each parent has at most one LEFT and one RIGHT child", shapeOk);

// for every non-root member, there's a depth-1 edge from its placement parent
let parentEdgesOk = true;
for (const m of members) {
  if (!m.parentId) continue;
  const e = closure.find((c) => c.ancestorId === m.parentId && c.descendantId === m.id && c.depth === 1);
  if (!e) {
    parentEdgesOk = false;
    console.log(`   missing depth-1 edge ${byId.get(m.parentId)?.memberCode} -> ${m.memberCode}`);
  }
}
check("depth-1 edge from each placement parent to child", parentEdgesOk);

// recompute ancestors by walking placementParentId, compare to closure
let pathsOk = true;
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
    pathsOk = false;
    console.log(`   ${m.memberCode}: expected ${JSON.stringify([...expected])} got ${JSON.stringify([...actual])}`);
  }
}
check("closure ancestors match placement-parent walk for every member", pathsOk);

const root = members.find((m) => m.memberCode === "AMA-ROOT01");
if (root) {
  const rootDownline = closure.filter((c) => c.ancestorId === root.id && c.depth >= 1);
  check("AMA-ROOT01 downline size", rootDownline.length === 5, `${rootDownline.length} (expect 5)`);
  const byDepth = rootDownline.reduce((a, c) => ((a[c.depth] = (a[c.depth] || 0) + 1), a), {});
  // ROOT01 sponsors PRIYA1, RAVIK1 and ANJAL1, but only two slots exist: ANJAL1 spills under RAVIK1
  check("AMA-ROOT01 level split", byDepth[1] === 2 && byDepth[2] === 3, JSON.stringify(byDepth));
  const anjali = members.find((m) => m.memberCode === "AMA-ANJAL1");
  check(
    "AMA-ANJAL1 spilled over (sponsor ROOT01, placed under RAVIK1)",
    anjali && anjali.sponsorId === root.id && byId.get(anjali.parentId)?.memberCode === "AMA-RAVIK1",
  );
} else {
  console.log("(skip) AMA-ROOT01 not found — run npm run db:seed first");
}

console.log("\ndone.");
