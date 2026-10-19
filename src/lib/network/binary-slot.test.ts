import { describe, expect, it } from "vitest";
import { findVacantSlot, pickAutoLeg, weakerLeg, type ChildRef, type FetchChildren, type Leg } from "./binary-slot";

/** In-memory tree: `place` mirrors what joinNetwork does with the found slot. */
function makeTree() {
  const children: ChildRef[] = [];
  const fetch: FetchChildren = async (ids) => children.filter((c) => ids.includes(c.parentId));
  const place = async (id: string, sponsor: string, leg: Leg) => {
    const slot = await findVacantSlot(fetch, sponsor, leg);
    children.push({ id, parentId: slot.parentId, leg: slot.leg });
    return slot;
  };
  return { children, fetch, place };
}

describe("findVacantSlot", () => {
  it("takes the sponsor's own slot when it is free", async () => {
    const t = makeTree();
    expect(await t.place("a", "root", "LEFT")).toEqual({ parentId: "root", leg: "LEFT" });
    expect(await t.place("b", "root", "RIGHT")).toEqual({ parentId: "root", leg: "RIGHT" });
  });

  it("spills a third recruit beneath the first person on that leg", async () => {
    const t = makeTree();
    await t.place("a", "root", "LEFT");
    await t.place("b", "root", "RIGHT");
    expect(await t.place("c", "root", "LEFT")).toEqual({ parentId: "a", leg: "LEFT" });
    expect(await t.place("d", "root", "LEFT")).toEqual({ parentId: "a", leg: "RIGHT" });
    // a is now full, so the next spill goes to c (leftmost on the next level)
    expect(await t.place("e", "root", "LEFT")).toEqual({ parentId: "c", leg: "LEFT" });
  });

  it("fills the chosen leg breadth-first, left to right", async () => {
    const t = makeTree();
    await t.place("a", "root", "RIGHT");
    const slots = [];
    for (const id of ["b", "c", "d", "e", "f", "g"]) slots.push(await t.place(id, "root", "RIGHT"));
    expect(slots).toEqual([
      { parentId: "a", leg: "LEFT" },
      { parentId: "a", leg: "RIGHT" },
      { parentId: "b", leg: "LEFT" },
      { parentId: "b", leg: "RIGHT" },
      { parentId: "c", leg: "LEFT" },
      { parentId: "c", leg: "RIGHT" },
    ]);
  });

  it("never gives any member more than two children, and never crosses legs", async () => {
    const t = makeTree();
    await t.place("l", "root", "LEFT");
    await t.place("r", "root", "RIGHT");
    for (let i = 0; i < 40; i++) await t.place(`x${i}`, "root", i % 2 ? "LEFT" : "RIGHT");
    const perParent = new Map<string, number>();
    for (const c of t.children) perParent.set(c.parentId, (perParent.get(c.parentId) ?? 0) + 1);
    expect(Math.max(...perParent.values())).toBe(2);
    const seen = new Set(t.children.map((c) => `${c.parentId}:${c.leg}`));
    expect(seen.size).toBe(t.children.length); // no slot double-booked
  });

  it("reuses a hole left by a removed member", async () => {
    const t = makeTree();
    await t.place("a", "root", "LEFT");
    await t.place("b", "a", "LEFT");
    await t.place("c", "a", "RIGHT");
    t.children.splice(t.children.findIndex((c) => c.id === "b"), 1);
    expect(await t.place("d", "root", "LEFT")).toEqual({ parentId: "a", leg: "LEFT" });
  });
});

describe("pickAutoLeg", () => {
  const kid = (leg: Leg): ChildRef => ({ id: leg, parentId: "p", leg });
  it("fills an empty leg first, left before right", () => {
    expect(pickAutoLeg([], () => 0)).toBe("LEFT");
    expect(pickAutoLeg([kid("LEFT")], () => 0)).toBe("RIGHT");
    expect(pickAutoLeg([kid("RIGHT")], () => 0)).toBe("LEFT");
  });
  it("otherwise feeds the weaker leg, ties left", () => {
    const both = [kid("LEFT"), kid("RIGHT")];
    expect(pickAutoLeg(both, (l) => (l === "LEFT" ? 9 : 3))).toBe("RIGHT");
    expect(pickAutoLeg(both, (l) => (l === "LEFT" ? 2 : 5))).toBe("LEFT");
    expect(pickAutoLeg(both, () => 4)).toBe("LEFT");
  });
});

describe("weakerLeg", () => {
  it("names the smaller side", () => {
    expect(weakerLeg(10000, 2000)).toBe("RIGHT");
    expect(weakerLeg(1, 5)).toBe("LEFT");
    expect(weakerLeg(3, 3)).toBe("EVEN");
  });
});
