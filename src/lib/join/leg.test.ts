import { describe, expect, it } from "vitest";
import { legParam, parseLeg } from "./leg";

describe("parseLeg", () => {
  it("accepts left/right in any case, and the l/r shorthands", () => {
    expect(parseLeg("left")).toBe("LEFT");
    expect(parseLeg(" RIGHT ")).toBe("RIGHT");
    expect(parseLeg("L")).toBe("LEFT");
    expect(parseLeg("r")).toBe("RIGHT");
  });

  it("treats anything else as no preference (a link can never break a sign-up)", () => {
    for (const v of ["", "up", "both", "auto", "LEFT;DROP", null, undefined]) expect(parseLeg(v)).toBeNull();
  });

  it("round-trips through the link parameter", () => {
    expect(parseLeg(legParam("LEFT"))).toBe("LEFT");
    expect(parseLeg(legParam("RIGHT"))).toBe("RIGHT");
  });
});
