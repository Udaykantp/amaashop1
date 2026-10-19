/**
 * The side of the referrer's binary tree a referral link asks for
 * (`?ref=AMA-XXXXXX&leg=left`). It is only a *request*: the placement engine
 * still puts the newcomer in the first vacant slot inside that leg (spillover),
 * and an admin can override it when approving.
 */

export type RequestedLeg = "LEFT" | "RIGHT";

/** Cookie that carries the requested side alongside `amaasop_ref` across pages. */
export const LEG_COOKIE = "amaasop_leg";

export function parseLeg(value: string | null | undefined): RequestedLeg | null {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "left" || v === "l") return "LEFT";
  if (v === "right" || v === "r") return "RIGHT";
  return null;
}

/** URL form used in links: `left` / `right`. */
export function legParam(leg: RequestedLeg): string {
  return leg === "LEFT" ? "left" : "right";
}
