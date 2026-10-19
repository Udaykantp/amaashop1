import "server-only";
import { weakerLeg, type Leg } from "@/lib/network/binary-slot";
import { add, money, mul, sub, ZERO, type Money } from "@/server/money";
import { Collections, db, doc } from "@/server/firestore";
import type { AppUserDoc, MemberProfileDoc, OrderDoc, OrderItemDoc, ProductDoc } from "@/server/models";
import type { BinaryLeg } from "@/server/enums";

/**
 * Read side of the binary genealogy: the chart the admin sees, and the
 * left-vs-right leg summary behind the weaker-leg rule.
 */

export const MAX_TREE_DEPTH = 4;

export interface BinaryTreeNode {
  id: string;
  memberCode: string;
  name: string;
  phone: string | null;
  status: string;
  joinedAt: string;
  sponsorCode: string | null;
  /** 0 = the chart's root. */
  level: number;
  /** Position under the parent; null for the chart root. */
  leg: BinaryLeg | null;
  parentId: string | null;
  leftId: string | null;
  rightId: string | null;
  /** Members on each side, counting the direct child on that side. */
  leftCount: number;
  rightCount: number;
}

export interface BinaryTree {
  /** Every member on levels 0..depth, root first. */
  nodes: BinaryTreeNode[];
  depth: number;
  /** The root's own placement parent, so the chart can offer "up one level". */
  upTo: { id: string; memberCode: string; name: string } | null;
}

interface ProfileRow {
  id: string;
  data: MemberProfileDoc;
}

async function childrenOf(parentIds: string[]): Promise<ProfileRow[]> {
  const rows: ProfileRow[] = [];
  for (let i = 0; i < parentIds.length; i += 30) {
    const snap = await db()
      .collection(Collections.memberProfiles)
      .where("placementParentId", "in", parentIds.slice(i, i + 30))
      .get();
    for (const d of snap.docs) rows.push({ id: d.id, data: d.data() as MemberProfileDoc });
  }
  return rows;
}

/** Team size of each member (themself + everyone below), keyed by member id. */
async function teamSizes(ids: string[]): Promise<Map<string, number>> {
  const counts = await Promise.all(
    ids.map((id) => db().collection(Collections.networkClosure).where("ancestorId", "==", id).count().get()),
  );
  return new Map(ids.map((id, i) => [id, counts[i]!.data().count]));
}

/**
 * Left and right team size for a batch of members — what the roster columns show.
 * Sizes count the direct child on that side plus everyone below them.
 */
export async function getLegCounts(memberIds: string[]): Promise<Map<string, { left: number; right: number }>> {
  const result = new Map(memberIds.map((id) => [id, { left: 0, right: 0 }]));
  if (memberIds.length === 0) return result;
  const kids = await childrenOf(memberIds);
  const sizes = await teamSizes(kids.map((k) => k.id));
  for (const k of kids) {
    const row = k.data.placementParentId ? result.get(k.data.placementParentId) : undefined;
    if (!row) continue;
    if (k.data.leg === "LEFT") row.left = sizes.get(k.id) ?? 0;
    else if (k.data.leg === "RIGHT") row.right = sizes.get(k.id) ?? 0;
  }
  return result;
}

/**
 * The chart under `rootId`, `depth` levels down. Reads one extra level of
 * profiles (not shown) purely so the last visible row can report how big each
 * of its two legs is.
 */
export async function getBinaryTree(rootId: string, depth = 3): Promise<BinaryTree | null> {
  const d = Math.max(1, Math.min(depth, MAX_TREE_DEPTH));
  const rootSnap = await doc(Collections.memberProfiles, rootId).get();
  if (!rootSnap.exists) return null;

  const levels: ProfileRow[][] = [[{ id: rootId, data: rootSnap.data() as MemberProfileDoc }]];
  for (let l = 0; l <= d; l++) {
    const prev = levels[l]!;
    levels.push(prev.length ? await childrenOf(prev.map((p) => p.id)) : []);
  }

  const all = levels.flat();
  const userIds = [...new Set(all.map((p) => p.data.userId))];
  const sponsorIds = [...new Set(levels.slice(0, d + 1).flat().map((p) => p.data.sponsorId).filter((x): x is string => !!x))];
  const parentId = levels[0]![0]!.data.placementParentId ?? null;
  const [userSnaps, sponsorSnaps, parentSnap, sizes] = await Promise.all([
    db().getAll(...userIds.map((id) => doc(Collections.appUsers, id))),
    sponsorIds.length ? db().getAll(...sponsorIds.map((id) => doc(Collections.memberProfiles, id))) : [],
    parentId ? doc(Collections.memberProfiles, parentId).get() : Promise.resolve(null),
    teamSizes(levels.slice(1).flat().map((p) => p.id)),
  ]);
  const users = new Map(userSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));
  const sponsorCodes = new Map(sponsorSnaps.filter((s) => s.exists).map((s) => [s.id, (s.data() as MemberProfileDoc).memberCode]));

  const childIndex = new Map<string, Partial<Record<Leg, string>>>();
  for (const p of levels.slice(1).flat()) {
    if (p.data.placementParentId && p.data.leg) {
      childIndex.set(p.data.placementParentId, { ...childIndex.get(p.data.placementParentId), [p.data.leg]: p.id });
    }
  }

  const nodes: BinaryTreeNode[] = [];
  levels.slice(0, d + 1).forEach((row, level) => {
    for (const p of row) {
      const kids = childIndex.get(p.id) ?? {};
      const user = users.get(p.data.userId);
      nodes.push({
        id: p.id,
        memberCode: p.data.memberCode,
        name: user?.displayName ?? p.data.memberCode,
        phone: user?.phone ?? null,
        status: p.data.status,
        joinedAt: p.data.joinedAt.toDate().toISOString(),
        sponsorCode: p.data.sponsorId ? (sponsorCodes.get(p.data.sponsorId) ?? null) : null,
        level,
        leg: level === 0 ? null : (p.data.leg ?? null),
        parentId: level === 0 ? null : (p.data.placementParentId ?? null),
        leftId: kids.LEFT ?? null,
        rightId: kids.RIGHT ?? null,
        leftCount: kids.LEFT ? (sizes.get(kids.LEFT) ?? 0) : 0,
        rightCount: kids.RIGHT ? (sizes.get(kids.RIGHT) ?? 0) : 0,
      });
    }
  });

  const parentProfile = parentSnap?.exists ? (parentSnap.data() as MemberProfileDoc) : null;
  let upTo: BinaryTree["upTo"] = null;
  if (parentSnap && parentProfile) {
    const parentUser = await doc(Collections.appUsers, parentProfile.userId).get();
    upTo = {
      id: parentSnap.id,
      memberCode: parentProfile.memberCode,
      name: parentUser.exists ? ((parentUser.data() as AppUserDoc).displayName ?? parentProfile.memberCode) : parentProfile.memberCode,
    };
  }

  return { nodes, depth: d, upTo };
}

// ── Leg summary (the weaker-leg rule) ────────────────────────────────────────

/** Order states that count towards volume — sales actually taken and not reversed. */
const VOLUME_STATUSES: OrderDoc["status"][] = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

export interface LegSummary {
  side: Leg;
  /** Direct child on this side, or null if the slot is empty. */
  head: { id: string; memberCode: string; name: string } | null;
  members: number;
  active: number;
  /** Business volume (BV) of the orders placed by members on this side. */
  volume: string;
}

export interface BinarySummary {
  left: LegSummary;
  right: LegSummary;
  weaker: Leg | "EVEN";
  /** Volume that earns commission: the weaker leg's. */
  payableVolume: string;
  /** Stronger-leg volume left over after matching — the weaker leg has to catch up to it. */
  carryVolume: string;
}

/**
 * A leg's volume = Σ (quantity × the product's BV) over the counted orders its
 * members placed. BV is the per-product "commissionable" figure set in the
 * catalog, so the weaker-leg rule pays on what the plan says it should, not on
 * the shelf price, GST or shipping.
 */
async function legVolume(memberIds: string[]): Promise<Money> {
  const orderRefs: FirebaseFirestore.DocumentReference[] = [];
  const chunks: string[][] = [];
  for (let i = 0; i < memberIds.length; i += 30) chunks.push(memberIds.slice(i, i + 30));
  for (let i = 0; i < chunks.length; i += 20) {
    const snaps = await Promise.all(
      chunks.slice(i, i + 20).map((c) => db().collection(Collections.orders).where("placedByMemberId", "in", c).get()),
    );
    for (const snap of snaps) {
      for (const d of snap.docs) if (VOLUME_STATUSES.includes((d.data() as OrderDoc).status)) orderRefs.push(d.ref);
    }
  }
  if (orderRefs.length === 0) return ZERO;

  const items: OrderItemDoc[] = [];
  for (let i = 0; i < orderRefs.length; i += 25) {
    const snaps = await Promise.all(orderRefs.slice(i, i + 25).map((r) => r.collection("items").get()));
    for (const snap of snaps) for (const d of snap.docs) items.push(d.data() as OrderItemDoc);
  }

  const productIds = [...new Set(items.map((it) => it.productId).filter((x): x is string => !!x))];
  const bvById = new Map<string, string>();
  for (let i = 0; i < productIds.length; i += 300) {
    const snaps = await db().getAll(...productIds.slice(i, i + 300).map((id) => doc(Collections.products, id)));
    for (const s of snaps) if (s.exists) bvById.set(s.id, (s.data() as ProductDoc).bv ?? "0");
  }

  let total: Money = ZERO;
  for (const it of items) {
    const bv = it.productId ? bvById.get(it.productId) : undefined;
    if (bv) total = add(total, mul(bv, it.qty));
  }
  return total;
}

async function summariseLeg(side: Leg, headId: string | null): Promise<LegSummary> {
  if (!headId) return { side, head: null, members: 0, active: 0, volume: ZERO.toFixed(2) };

  const [headSnap, edgesSnap] = await Promise.all([
    doc(Collections.memberProfiles, headId).get(),
    db().collection(Collections.networkClosure).where("ancestorId", "==", headId).get(),
  ]);
  const head = headSnap.data() as MemberProfileDoc;
  const ids = edgesSnap.docs.map((e) => e.get("descendantId") as string);

  const profileSnaps: FirebaseFirestore.DocumentSnapshot[] = [];
  for (let i = 0; i < ids.length; i += 300) {
    profileSnaps.push(...(await db().getAll(...ids.slice(i, i + 300).map((id) => doc(Collections.memberProfiles, id)))));
  }
  const active = profileSnaps.filter((s) => s.exists && (s.data() as MemberProfileDoc).status === "ACTIVE").length;
  const [userSnap, volume] = await Promise.all([doc(Collections.appUsers, head.userId).get(), legVolume(ids)]);

  return {
    side,
    head: {
      id: headId,
      memberCode: head.memberCode,
      name: userSnap.exists ? ((userSnap.data() as AppUserDoc).displayName ?? head.memberCode) : head.memberCode,
    },
    members: ids.length,
    active,
    volume: volume.toFixed(2),
  };
}

/** Left vs right for one member — member counts, sales volume, and which leg pays. */
export async function getBinarySummary(memberId: string): Promise<BinarySummary> {
  const kids = await childrenOf([memberId]);
  const idFor = (leg: Leg) => kids.find((k) => k.data.leg === leg)?.id ?? null;
  const [left, right] = await Promise.all([summariseLeg("LEFT", idFor("LEFT")), summariseLeg("RIGHT", idFor("RIGHT"))]);

  const l = money(left.volume);
  const r = money(right.volume);
  return {
    left,
    right,
    weaker: weakerLeg(l.toNumber(), r.toNumber()),
    payableVolume: (l.lessThan(r) ? l : r).toFixed(2),
    carryVolume: sub(l.greaterThan(r) ? l : r, l.lessThan(r) ? l : r).toFixed(2),
  };
}
