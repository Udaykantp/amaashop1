/**
 * Pure binary-tree slot search — no Firestore, so it is unit-testable.
 *
 * Each member has exactly two frontline slots (LEFT, RIGHT). When a slot under
 * the sponsor is already taken, the newcomer "spills over": we walk the
 * sponsor's chosen leg level by level, left to right, and take the first
 * vacant slot. That fills a leg evenly instead of growing one long chain, which
 * is what keeps both legs balanced for the weaker-leg payout.
 */

export type Leg = "LEFT" | "RIGHT";

export interface ChildRef {
  id: string;
  parentId: string;
  leg: Leg;
}

/** Returns every child (0–2 per parent) of the given parents. May be called with many ids. */
export type FetchChildren = (parentIds: string[]) => Promise<ChildRef[]>;

export interface Slot {
  parentId: string;
  leg: Leg;
}

export const oppositeLeg = (leg: Leg): Leg => (leg === "LEFT" ? "RIGHT" : "LEFT");

/**
 * First vacant slot in `leg` of `sponsorId`: the sponsor's own slot if free,
 * otherwise the leftmost vacancy, breadth-first, inside that leg's subtree.
 */
export async function findVacantSlot(fetchChildren: FetchChildren, sponsorId: string, leg: Leg): Promise<Slot> {
  const first = (await fetchChildren([sponsorId])).find((c) => c.leg === leg);
  if (!first) return { parentId: sponsorId, leg };

  let frontier = [first.id];
  while (frontier.length > 0) {
    const kids = await fetchChildren(frontier);
    const byParent = new Map<string, Partial<Record<Leg, string>>>();
    for (const k of kids) byParent.set(k.parentId, { ...byParent.get(k.parentId), [k.leg]: k.id });

    const next: string[] = [];
    for (const parentId of frontier) {
      const slots = byParent.get(parentId) ?? {};
      if (!slots.LEFT) return { parentId, leg: "LEFT" };
      if (!slots.RIGHT) return { parentId, leg: "RIGHT" };
      next.push(slots.LEFT, slots.RIGHT);
    }
    frontier = next;
  }
  // Unreachable: every finite binary tree has a vacancy.
  throw new Error("No vacant slot found in the binary tree.");
}

/**
 * Where an "auto" placement goes: the sponsor's empty leg if there is one
 * (left first), otherwise whichever leg is smaller, ties going left.
 */
export function pickAutoLeg(sponsorChildren: ChildRef[], legSize: (leg: Leg) => number): Leg {
  const has = (leg: Leg) => sponsorChildren.some((c) => c.leg === leg);
  if (!has("LEFT")) return "LEFT";
  if (!has("RIGHT")) return "RIGHT";
  return legSize("RIGHT") < legSize("LEFT") ? "RIGHT" : "LEFT";
}

/** The weaker leg pays: commissionable volume is the smaller side. */
export function weakerLeg(left: number, right: number): Leg | "EVEN" {
  if (left === right) return "EVEN";
  return left < right ? "LEFT" : "RIGHT";
}
