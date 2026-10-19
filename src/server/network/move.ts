import "server-only";
import { findVacantSlot, type Leg } from "@/lib/network/binary-slot";
import { Collections, db, doc, nowSentinel } from "@/server/firestore";
import type { MemberProfileDoc, NetworkClosureDoc } from "@/server/models";
import { log } from "@/server/log";
import { fetchChildrenInDb } from "@/server/network/placement";

/**
 * Manual genealogy operations — re-placing a subtree at a new slot in the
 * binary tree, and terminating a member with downline compression. Both
 * rebuild closure-table edges. Callers MUST have enforced capability + 2FA and
 * are responsible for writing the audit entry.
 *
 * The tree is binary: a "position" is a (parent, LEFT|RIGHT) slot and holds at
 * most one member. Moving a node changes only its placement — the referral
 * sponsor (`sponsorId`) is untouched, so referral credit never moves with the
 * chart.
 *
 * Closure invariant: exactly one row per (ancestor, descendant) incl. self at
 * depth 0. "Move node N under P" only rewrites edges that CROSS the boundary of
 * N's subtree — internal structure (and its depths relative to N) is untouched.
 *
 * Firestore transactions cap out at ~500 mutations. A small move (the common
 * case — an admin moving one leaf or a small branch) runs atomically in one
 * transaction, exactly like the old Postgres version. A subtree large enough
 * to exceed that limit instead runs as chunked, non-transactional batched
 * writes — every write is idempotent (`set` replaces a doc wholesale,
 * `delete` is a no-op if already gone), so a crash mid-move is safely
 * resumable, not silently half-applied. This is a known, accepted trade-off vs.
 * Postgres, documented in the migration plan.
 */

export class MoveError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CYCLE" | "SAME_PARENT" | "SELF" | "TERMINATED" | "SLOT_TAKEN" | "ROOT",
  ) {
    super(message);
    this.name = "MoveError";
  }
}

export interface MoveResult {
  movedMemberId: string;
  oldParentId: string | null;
  oldLeg: Leg | null;
  newParentId: string;
  newLeg: Leg;
  subtreeSize: number;
}

const TRANSACTION_WRITE_BUDGET = 450; // stay well under Firestore's 500-mutation cap
const BATCH_CHUNK_SIZE = 450;

interface MovePlan {
  node: MemberProfileDoc;
  subtree: { descendantId: string; depth: number }[];
  edgesToDeleteIds: string[]; // network_closure doc ids
  edgesToInsert: NetworkClosureDoc[];
}

interface MoveOptions {
  /** A member allowed to still be sitting in the target slot (used while compressing after a termination). */
  slotHeldBy?: string;
}

async function planMove(memberId: string, newParentId: string, leg: Leg, opts: MoveOptions): Promise<MovePlan> {
  const firestore = db();
  const nodeSnap = await doc(Collections.memberProfiles, memberId).get();
  if (!nodeSnap.exists) throw new MoveError("Member not found.", "NOT_FOUND");
  const node = nodeSnap.data() as MemberProfileDoc;
  if (node.terminatedAt) throw new MoveError("Member is terminated.", "TERMINATED");
  if (!node.placementParentId) throw new MoveError("The root of the network can't be moved.", "ROOT");
  if (newParentId === memberId) throw new MoveError("A member can't be placed under themself.", "SELF");
  if (node.placementParentId === newParentId && node.leg === leg) {
    throw new MoveError("Already in that position.", "SAME_PARENT");
  }

  const newParentSnap = await doc(Collections.memberProfiles, newParentId).get();
  if (!newParentSnap.exists) throw new MoveError("New parent not found.", "NOT_FOUND");
  if ((newParentSnap.data() as MemberProfileDoc).terminatedAt) {
    throw new MoveError("New parent is terminated.", "TERMINATED");
  }
  // cycle guard: the new parent must not be inside the moving subtree
  const inSubtree = await doc(Collections.networkClosure, `${memberId}_${newParentId}`).get();
  if (inSubtree.exists) throw new MoveError("Can't move a member under their own downline.", "CYCLE");

  // a slot holds one member
  const occupant = await firestore
    .collection(Collections.memberProfiles)
    .where("placementParentId", "==", newParentId)
    .where("leg", "==", leg)
    .limit(2)
    .get();
  if (occupant.docs.some((d) => d.id !== memberId && d.id !== opts.slotHeldBy)) {
    throw new MoveError(`That ${leg.toLowerCase()} slot is already taken.`, "SLOT_TAKEN");
  }

  // the moving subtree, with each node's depth relative to `memberId` and its own join date
  const subtreeSnap = await firestore.collection(Collections.networkClosure).where("ancestorId", "==", memberId).get();
  const subtree = subtreeSnap.docs.map((d) => {
    const data = d.data() as NetworkClosureDoc;
    return { descendantId: data.descendantId, depth: data.depth, joinedAt: data.descendantJoinedAt };
  });
  const subtreeIds = new Set(subtree.map((s) => s.descendantId));

  // Every edge coming INTO the subtree from an ancestor OUTSIDE it must be
  // dropped. Firestore's `in` operator caps at 30 values, so this queries in
  // chunks of 30 subtree members at a time.
  const edgesToDeleteIds: string[] = [];
  const idsArr = [...subtreeIds];
  for (let i = 0; i < idsArr.length; i += 30) {
    const chunk = idsArr.slice(i, i + 30);
    const snap = await firestore.collection(Collections.networkClosure).where("descendantId", "in", chunk).get();
    for (const d of snap.docs) {
      const data = d.data() as NetworkClosureDoc;
      if (!subtreeIds.has(data.ancestorId)) edgesToDeleteIds.push(d.id);
    }
  }

  // new external ancestors = closure(descendant = newParent) ∪ {(newParent, 0)}
  const rowsSnap = await firestore.collection(Collections.networkClosure).where("descendantId", "==", newParentId).get();
  const newAncestors = rowsSnap.docs.map((d) => {
    const data = d.data() as NetworkClosureDoc;
    return { ancestorId: data.ancestorId, depth: data.depth };
  });

  const edgesToInsert: NetworkClosureDoc[] = [];
  for (const s of subtree) {
    for (const a of newAncestors) {
      edgesToInsert.push({
        ancestorId: a.ancestorId,
        descendantId: s.descendantId,
        depth: a.depth + 1 + s.depth,
        descendantJoinedAt: s.joinedAt,
      });
    }
  }

  return { node, subtree, edgesToDeleteIds, edgesToInsert };
}

/**
 * Re-place `memberId` (and its whole subtree) into the `leg` slot beneath
 * `newParentId`. The slot must be vacant.
 */
export async function moveMemberSubtree(
  memberId: string,
  newParentId: string,
  leg: Leg,
  opts: MoveOptions = {},
): Promise<MoveResult> {
  const firestore = db();
  const plan = await planMove(memberId, newParentId, leg, opts);
  const totalWrites = plan.edgesToDeleteIds.length + plan.edgesToInsert.length + 1;

  const profileUpdate = {
    placementParentId: newParentId,
    leg,
    lastMovedAt: nowSentinel(),
    lastMovedFromId: plan.node.placementParentId ?? null,
  } satisfies Partial<MemberProfileDoc>;

  if (totalWrites <= TRANSACTION_WRITE_BUDGET) {
    await firestore.runTransaction(async (tx) => {
      // Re-check the slot inside the transaction so two admins can't both take it.
      const occupant = await tx.get(
        firestore
          .collection(Collections.memberProfiles)
          .where("placementParentId", "==", newParentId)
          .where("leg", "==", leg)
          .limit(2),
      );
      if (occupant.docs.some((d) => d.id !== memberId && d.id !== opts.slotHeldBy)) {
        throw new MoveError(`That ${leg.toLowerCase()} slot is already taken.`, "SLOT_TAKEN");
      }
      for (const id of plan.edgesToDeleteIds) tx.delete(doc(Collections.networkClosure, id));
      for (const row of plan.edgesToInsert) {
        tx.set(doc(Collections.networkClosure, `${row.ancestorId}_${row.descendantId}`), row);
      }
      tx.update(doc(Collections.memberProfiles, memberId), profileUpdate);
    });
  } else {
    // Large subtree: chunked, idempotent, non-transactional writes.
    const deleteRefs = plan.edgesToDeleteIds.map((id) => doc(Collections.networkClosure, id));
    for (let i = 0; i < deleteRefs.length; i += BATCH_CHUNK_SIZE) {
      const batch = firestore.batch();
      for (const ref of deleteRefs.slice(i, i + BATCH_CHUNK_SIZE)) batch.delete(ref);
      await batch.commit();
    }
    for (let i = 0; i < plan.edgesToInsert.length; i += BATCH_CHUNK_SIZE) {
      const batch = firestore.batch();
      for (const row of plan.edgesToInsert.slice(i, i + BATCH_CHUNK_SIZE)) {
        batch.set(doc(Collections.networkClosure, `${row.ancestorId}_${row.descendantId}`), row);
      }
      await batch.commit();
    }
    await doc(Collections.memberProfiles, memberId).update(profileUpdate);
  }

  log.warn("genealogy node moved", {
    memberId,
    fromParent: plan.node.placementParentId ?? null,
    fromLeg: plan.node.leg ?? null,
    toParent: newParentId,
    toLeg: leg,
    subtreeSize: plan.subtree.length,
  });

  return {
    movedMemberId: memberId,
    oldParentId: plan.node.placementParentId ?? null,
    oldLeg: plan.node.leg ?? null,
    newParentId,
    newLeg: leg,
    subtreeSize: plan.subtree.length,
  };
}

export interface TerminateResult {
  terminatedMemberId: string;
  /** The terminated member's parent — whose slot the survivor inherited. */
  compressedIntoId: string | null;
  liftedChildren: number;
}

/**
 * Terminate `memberId` and close the hole. In a binary tree a member can have
 * two children but only one slot to hand on, so:
 *   - no children: the slot simply empties
 *   - one child: they step up into the terminated member's slot
 *   - two children: the LEFT one steps up, and the RIGHT one (with its whole
 *     team) is re-placed at the first vacant slot inside the left one's team
 * The member row stays for audit/history but is marked TERMINATED and dropped
 * from the closure tree. Referral sponsors are not touched.
 */
export async function terminateAndCompress(memberId: string, reason: string): Promise<TerminateResult> {
  const firestore = db();
  const nodeSnap = await doc(Collections.memberProfiles, memberId).get();
  if (!nodeSnap.exists) throw new MoveError("Member not found.", "NOT_FOUND");
  const node = nodeSnap.data() as MemberProfileDoc;
  if (node.terminatedAt) throw new MoveError("Already terminated.", "TERMINATED");

  // Need the userId to suspend the login below.
  const userId = (await getUserIdForMember(memberId)) ?? "";

  const childrenSnap = await firestore.collection(Collections.memberProfiles).where("placementParentId", "==", memberId).get();
  const kids = childrenSnap.docs.map((d) => ({ id: d.id, leg: (d.data() as MemberProfileDoc).leg }));
  const left = kids.find((k) => k.leg === "LEFT");
  const right = kids.find((k) => k.leg === "RIGHT");

  if (kids.length > 0 && !(node.placementParentId && node.leg)) {
    throw new MoveError(
      "The root of the network can't be terminated while it has a team — there's nowhere to promote them to.",
      "ROOT",
    );
  }

  // Each move is its own atomic (or chunked) operation — terminate-and-compress
  // as a whole is NOT one big transaction (it wasn't fully atomic under
  // Postgres either).
  if (left && right) {
    const slot = await findVacantSlot(fetchChildrenInDb, left.id, "RIGHT");
    await moveMemberSubtree(right.id, slot.parentId, slot.leg);
  }
  const survivor = left ?? right;
  if (survivor) {
    await moveMemberSubtree(survivor.id, node.placementParentId!, node.leg!, { slotHeldBy: memberId });
  }

  await firestore.runTransaction(async (tx) => {
    // remove the terminated member from the closure tree entirely
    const [asAncestor, asDescendant] = await Promise.all([
      tx.get(firestore.collection(Collections.networkClosure).where("ancestorId", "==", memberId)),
      tx.get(firestore.collection(Collections.networkClosure).where("descendantId", "==", memberId)),
    ]);
    const seen = new Set<string>();
    for (const snap of [asAncestor, asDescendant]) {
      for (const d of snap.docs) seen.add(d.id);
    }
    for (const id of seen) tx.delete(doc(Collections.networkClosure, id));

    tx.update(doc(Collections.memberProfiles, memberId), {
      status: "TERMINATED",
      terminatedAt: nowSentinel(),
      frozenAt: nowSentinel(),
      frozenReason: reason,
      compressedIntoId: node.placementParentId ?? null,
      sponsorId: null,
      placementParentId: null,
      leg: null,
    } satisfies Partial<MemberProfileDoc>);

    if (userId) tx.update(doc(Collections.appUsers, userId), { status: "SUSPENDED" });
  });

  log.warn("member terminated + team compressed", {
    memberId,
    compressedInto: node.placementParentId ?? null,
    liftedChildren: kids.length,
  });

  return {
    terminatedMemberId: memberId,
    compressedIntoId: node.placementParentId ?? null,
    liftedChildren: kids.length,
  };
}

async function getUserIdForMember(memberId: string): Promise<string | null> {
  const snap = await doc(Collections.memberProfiles, memberId).get();
  return snap.exists ? (snap.data() as MemberProfileDoc).userId : null;
}

/** Freeze / unfreeze: halts wallet withdrawals + referral link, keeps tree intact. */
export async function setMemberFrozen(memberId: string, frozen: boolean, reason: string | null): Promise<void> {
  await doc(Collections.memberProfiles, memberId).update(
    frozen
      ? ({ frozenAt: nowSentinel(), frozenReason: reason ?? "Compliance hold", status: "SUSPENDED" } satisfies Partial<MemberProfileDoc>)
      : ({ frozenAt: null, frozenReason: null, status: "ACTIVE" } satisfies Partial<MemberProfileDoc>),
  );
  log.warn("member frozen state changed", { memberId, frozen });
}
