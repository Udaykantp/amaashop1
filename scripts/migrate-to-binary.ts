/**
 * One-time conversion of the genealogy from the old unilevel tree (a member's
 * sponsor was their tree parent, unlimited width) to the BINARY plan (two slots
 * per member, spillover below).
 *
 *   npm run network:migrate-binary         # dry run — prints the plan, writes nothing
 *   npm run network:migrate-binary:apply   # backs up, then rewrites placement + closure
 *
 * (`--apply` is baked into the second script because Windows PowerShell can swallow
 * a trailing `-- --apply` before it reaches the script, silently leaving a dry run.)
 *
 * What it does, deterministically:
 *   1. Members are re-placed in join order (sponsors always before their
 *      recruits). Each goes under their SPONSOR — first into the sponsor's empty
 *      left slot, then right, and once both are taken they spill over to the
 *      first vacant slot below the sponsor's weaker leg (same rule as
 *      `joinNetwork` uses for AUTO placement).
 *   2. `sponsorId` (the referrer) is never touched — only `placementParentId`,
 *      `leg` and `placementStrategy` are written.
 *   3. `network_closure` is rebuilt from the new tree.
 * A member whose sponsor had at most two recruits keeps exactly the same parent
 * as before. Only third-and-later recruits move (spillover).
 *
 * Run it when nobody is enrolling — new joins are refused until it finishes
 * (they need every sponsor to be on the binary plan). A JSON backup of the old
 * placement + closure rows is written next to this script before any change.
 */
import { writeFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore, type Firestore } from "firebase-admin/firestore";
import { findVacantSlot, pickAutoLeg, type ChildRef, type Leg } from "../src/lib/network/binary-slot";

function initAdmin(): Firestore {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "amaashop-dev";
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) {
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

const APPLY = process.argv.includes("--apply") || process.env.MIGRATE_APPLY === "1";
const FORCE = process.argv.includes("--force");

interface Member {
  id: string;
  code: string;
  sponsorId: string | null;
  joinedAt: Timestamp;
  strategy: string | null;
  terminated: boolean;
}

async function main() {
  const db = initAdmin();
  console.log(APPLY ? "MODE: APPLY (will write)\n" : "MODE: dry run (nothing is written — run `npm run network:migrate-binary:apply` to convert)\n");

  const snap = await db.collection("member_profiles").get();
  const all: Member[] = snap.docs.map((d) => ({
    id: d.id,
    code: d.get("memberCode"),
    sponsorId: d.get("sponsorId") ?? null,
    joinedAt: d.get("joinedAt"),
    strategy: d.get("placementStrategy") ?? null,
    terminated: Boolean(d.get("terminatedAt")),
  }));
  const live = all.filter((m) => !m.terminated);
  const terminated = all.filter((m) => m.terminated);
  console.log(`${live.length} live members, ${terminated.length} terminated (terminated members are left out of the tree).`);
  if (live.length === 0) return console.log("Nothing to convert.");

  const binary = live.filter((m) => m.strategy === "BINARY").length;
  if (binary === live.length) return console.log("Every member is already on the binary plan — nothing to do.");
  if (binary > 0 && !FORCE) {
    throw new Error(
      `Mixed state: ${binary} of ${live.length} members are already BINARY. A re-run recomputes EVERY placement from the referral tree, ` +
        `which would rearrange members who joined the binary tree for real. If that is what you want (an earlier run crashed part-way), add --force.`,
    );
  }

  // ── plan: replay joins in order ────────────────────────────────────────────
  const roots = live.filter((m) => !m.sponsorId);
  if (roots.length !== 1) {
    throw new Error(`Expected exactly one root (a live member with no sponsor), found ${roots.length}: ${roots.map((r) => r.code).join(", ")}`);
  }
  const liveIds = new Set(live.map((m) => m.id));
  const orphan = live.find((m) => m.sponsorId && !liveIds.has(m.sponsorId));
  if (orphan) throw new Error(`${orphan.code} has a sponsor that is missing or terminated — fix that before converting.`);

  const order = [...live].sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis() || a.id.localeCompare(b.id));
  const placement = new Map<string, { parentId: string | null; leg: Leg | null }>();
  const children: ChildRef[] = [];
  const size = new Map<string, number>(); // team size including self
  const fetchChildren = async (ids: string[]) => children.filter((c) => ids.includes(c.parentId));
  const legSize = (parentId: string, leg: Leg) => {
    const c = children.find((k) => k.parentId === parentId && k.leg === leg);
    return c ? (size.get(c.id) ?? 0) : 0;
  };

  const queue = [...order];
  let stalled = 0;
  while (queue.length) {
    const m = queue.shift()!;
    if (!m.sponsorId) {
      placement.set(m.id, { parentId: null, leg: null });
      size.set(m.id, 1);
      continue;
    }
    if (!placement.has(m.sponsorId)) {
      // sponsor's join date is later than theirs (data glitch) — retry after the rest
      queue.push(m);
      if (++stalled > queue.length + 1) throw new Error("Referral loop or unresolvable sponsor chain detected.");
      continue;
    }
    stalled = 0;
    const sponsorKids = children.filter((c) => c.parentId === m.sponsorId);
    const leg = pickAutoLeg(sponsorKids, (l) => legSize(m.sponsorId!, l));
    const slot = await findVacantSlot(fetchChildren, m.sponsorId, leg);
    placement.set(m.id, { parentId: slot.parentId, leg: slot.leg });
    children.push({ id: m.id, parentId: slot.parentId, leg: slot.leg });
    size.set(m.id, 1);
    for (let up: string | null = slot.parentId; up; up = placement.get(up)?.parentId ?? null) {
      size.set(up, (size.get(up) ?? 1) + 1);
    }
  }

  const byId = new Map(live.map((m) => [m.id, m]));
  const spilled = live.filter((m) => m.sponsorId && placement.get(m.id)!.parentId !== m.sponsorId);
  const depthOf = (id: string) => {
    let d = 0;
    for (let p = placement.get(id)!.parentId; p; p = placement.get(p)!.parentId) d++;
    return d;
  };
  const maxDepth = Math.max(...live.map((m) => depthOf(m.id)));
  const root = roots[0]!;
  const rootKids = children.filter((c) => c.parentId === root.id);
  console.log(`Root: ${root.code}`);
  console.log(`Deepest level after conversion: ${maxDepth}`);
  console.log(`Members that keep their current parent: ${live.length - 1 - spilled.length}`);
  console.log(`Members that spill over to a different parent: ${spilled.length}`);
  for (const m of spilled.slice(0, 15)) {
    const p = placement.get(m.id)!;
    console.log(`   ${m.code}: sponsor ${byId.get(m.sponsorId!)!.code} → placed under ${byId.get(p.parentId!)!.code} (${p.leg!.toLowerCase()})`);
  }
  if (spilled.length > 15) console.log(`   … and ${spilled.length - 15} more`);
  console.log(
    `Root legs: left ${rootKids.find((k) => k.leg === "LEFT") ? size.get(rootKids.find((k) => k.leg === "LEFT")!.id) : 0}, ` +
      `right ${rootKids.find((k) => k.leg === "RIGHT") ? size.get(rootKids.find((k) => k.leg === "RIGHT")!.id) : 0}`,
  );

  // closure rows for the new tree
  const closure: { id: string; ancestorId: string; descendantId: string; depth: number; descendantJoinedAt: Timestamp }[] = [];
  for (const m of live) {
    let depth = 0;
    for (let a: string | null = m.id; a; a = placement.get(a)!.parentId, depth++) {
      closure.push({ id: `${a}_${m.id}`, ancestorId: a, descendantId: m.id, depth, descendantJoinedAt: m.joinedAt });
    }
  }
  console.log(`Closure rows to write: ${closure.length}`);

  if (!APPLY) return console.log("\nDry run only. To convert, run: npm run network:migrate-binary:apply");

  // ── backup ─────────────────────────────────────────────────────────────────
  const oldClosure = await db.collection("network_closure").get();
  const backupPath = new URL(`./network-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, import.meta.url);
  writeFileSync(
    backupPath,
    JSON.stringify(
      {
        members: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        closure: oldClosure.docs.map((d) => ({ id: d.id, ...d.data() })),
      },
      null,
      1,
    ),
  );
  console.log(`\nBackup written: ${backupPath.pathname.replace(/^\/([A-Za-z]:)/, "$1")}`);

  // ── write ──────────────────────────────────────────────────────────────────
  const writer = db.bulkWriter();
  writer.onWriteError((e) => {
    console.error("write failed:", e.documentRef.path, e.message);
    return e.failedAttempts < 5;
  });
  for (const m of live) {
    const p = placement.get(m.id)!;
    writer.update(db.collection("member_profiles").doc(m.id), {
      placementParentId: p.parentId,
      leg: p.leg,
      placementStrategy: "BINARY",
    });
  }
  for (const t of terminated) {
    writer.update(db.collection("member_profiles").doc(t.id), { placementParentId: null, leg: null, placementStrategy: "BINARY" });
  }
  const keep = new Set(closure.map((c) => c.id));
  for (const d of oldClosure.docs) if (!keep.has(d.id)) writer.delete(d.ref); // the rest are overwritten below
  for (const c of closure) {
    writer.set(db.collection("network_closure").doc(c.id), {
      ancestorId: c.ancestorId,
      descendantId: c.descendantId,
      depth: c.depth,
      descendantJoinedAt: c.descendantJoinedAt,
    });
  }
  await writer.close();
  console.log("Converted. Reload /admin/network to see the binary tree.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
