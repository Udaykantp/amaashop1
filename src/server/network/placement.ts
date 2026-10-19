import "server-only";
import type { Transaction } from "firebase-admin/firestore";
import { findVacantSlot, pickAutoLeg, type ChildRef, type FetchChildren, type Leg } from "@/lib/network/binary-slot";
import { Collections, db } from "@/server/firestore";
import type { PlacementStrategy as PlacementKind } from "@/server/enums";
import type { MemberProfileDoc } from "@/server/models";

/**
 * Placement — where a new member lands in the genealogy.
 *
 * The plan is a BINARY tree: every member has exactly two frontline slots
 * (LEFT, RIGHT). A third recruit "spills over" to the first vacant slot below
 * one of the sponsor's existing people. The sponsor (referrer) is recorded
 * separately as `MemberProfileDoc.sponsorId` and never changes with spillover;
 * `placementParentId` + `leg` is the tree position, and the closure table
 * follows that.
 */

export type Tx = Transaction;
export type { Leg };
export type LegPreference = Leg | "AUTO";

export interface PlacementInput {
  /** The sponsor the new member registered under (their referrer). */
  sponsorId: string;
  /** Which leg of the sponsor to grow; "AUTO" feeds the weaker one. */
  preferredLeg?: LegPreference;
}

export interface PlacementResult {
  /** The member the new node is attached beneath (its binary parent). */
  parentId: string;
  leg: Leg;
}

export interface PlacementStrategy {
  readonly kind: PlacementKind;
  place(tx: Tx, input: PlacementInput): Promise<PlacementResult>;
}

/** `where placementParentId in (...)`, chunked at Firestore's 30-value `in` cap. */
function childFetcher(read: (q: FirebaseFirestore.Query) => Promise<FirebaseFirestore.QuerySnapshot>): FetchChildren {
  return async (parentIds) => {
    const out: ChildRef[] = [];
    for (let i = 0; i < parentIds.length; i += 30) {
      const chunk = parentIds.slice(i, i + 30);
      const snap = await read(db().collection(Collections.memberProfiles).where("placementParentId", "in", chunk));
      for (const d of snap.docs) {
        const m = d.data() as MemberProfileDoc;
        if (m.placementParentId && m.leg) out.push({ id: d.id, parentId: m.placementParentId, leg: m.leg });
      }
    }
    return out;
  };
}

export const fetchChildrenInDb: FetchChildren = childFetcher((q) => q.get());

/** Size of the team under (and including) one direct child — 0 when the slot is empty. */
function legSizeReader(tx: Tx, children: ChildRef[]) {
  return async (): Promise<Record<Leg, number>> => {
    const size = async (leg: Leg) => {
      const child = children.find((c) => c.leg === leg);
      if (!child) return 0;
      const snap = await tx.get(
        db().collection(Collections.networkClosure).where("ancestorId", "==", child.id).count(),
      );
      return snap.data().count;
    };
    const [LEFT, RIGHT] = await Promise.all([size("LEFT"), size("RIGHT")]);
    return { LEFT, RIGHT };
  };
}

export const BinaryPlacement: PlacementStrategy = {
  kind: "BINARY",
  async place(tx, { sponsorId, preferredLeg = "AUTO" }) {
    const fetchInTx = childFetcher((q) => tx.get(q));

    let leg: Leg;
    if (preferredLeg === "AUTO") {
      const sponsorChildren = await fetchInTx([sponsorId]);
      const sizes = sponsorChildren.length === 2 ? await legSizeReader(tx, sponsorChildren)() : { LEFT: 0, RIGHT: 0 };
      leg = pickAutoLeg(sponsorChildren, (l) => sizes[l]);
    } else {
      leg = preferredLeg;
    }

    const slot = await findVacantSlot(fetchInTx, sponsorId, leg);
    return { parentId: slot.parentId, leg: slot.leg };
  },
};

export function getPlacementStrategy(kind: PlacementKind = "BINARY"): PlacementStrategy {
  switch (kind) {
    case "BINARY":
      return BinaryPlacement;
    // case "MATRIX": return MatrixPlacement;   // not built
    default:
      throw new Error(`Placement strategy "${kind}" is not implemented — the network is binary.`);
  }
}
