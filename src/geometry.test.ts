import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import { EAST, lerpFacing, NORTH, WEST } from "./geometry";

describe("lerpFacing", () => {
  it("lerps via short arc by default", () => {
    const result = lerpFacing(NORTH, EAST, 0.5);
    // Short arc from NORTH to EAST is clockwise (negative ccw),
    // midpoint is NE
    expect(result.x).toBeCloseTo(Math.SQRT1_2);
    expect(result.y).toBeCloseTo(Math.SQRT1_2);
  });

  it("forces cw when short arc would be ccw", () => {
    // NORTH to EAST: short arc is cw already, forceDir cw should be same
    const result = lerpFacing(NORTH, EAST, 0.5, { forceDir: "cw" });
    expect(result.x).toBeCloseTo(Math.SQRT1_2);
    expect(result.y).toBeCloseTo(Math.SQRT1_2);
  });

  it("forces ccw when short arc would be cw", () => {
    // NORTH to EAST: short arc is cw (negative ccw angle).
    // Forcing ccw should go the long way around (NORTH -> WEST -> SOUTH -> EAST).
    // Midpoint of long arc ccw is SOUTH-WEST? No...
    // ccw from NORTH to EAST the long way is 270 degrees ccw.
    // At frac=0.5, that's 135 degrees ccw from NORTH = SOUTH-WEST.
    const result = lerpFacing(NORTH, EAST, 0.5, { forceDir: "ccw" });
    expect(result.x).toBeCloseTo(-Math.SQRT1_2);
    expect(result.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it("forces cw when short arc would be ccw", () => {
    // NORTH to WEST: short arc is ccw (positive ccw angle of +90).
    // Forcing cw should go the long way: 270 degrees cw (= -270 ccw).
    // At frac=0.5, that's 135 degrees cw from NORTH = SOUTH-EAST.
    const result = lerpFacing(NORTH, WEST, 0.5, { forceDir: "cw" });
    expect(result.x).toBeCloseTo(Math.SQRT1_2);
    expect(result.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it("ignores forceDir when vectors are within tolerance", () => {
    // Two vectors very close together — forceDir should be ignored
    const a = NORTH;
    const b = new Vector(Math.sin(0.05), Math.cos(0.05)); // ~0.05 rad from NORTH
    const withForce = lerpFacing(a, b, 0.5, {
      forceDir: "ccw",
      forceDirTolerance: 0.1,
    });
    const without = lerpFacing(a, b, 0.5);
    expect(withForce.x).toBeCloseTo(without.x);
    expect(withForce.y).toBeCloseTo(without.y);
  });

  it("applies forceDir when vectors are beyond tolerance", () => {
    // NORTH to EAST is ~1.57 rad apart, well beyond 0.1 tolerance
    const forced = lerpFacing(NORTH, EAST, 0.5, { forceDir: "ccw" });
    const normal = lerpFacing(NORTH, EAST, 0.5);
    // They should differ (forced goes the long way)
    expect(forced.x).not.toBeCloseTo(normal.x);
  });
});
