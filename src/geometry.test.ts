import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import {
  catmullRom,
  catmullRomAngle,
  EAST,
  lerpFacing,
  NORTH,
  PI,
  WEST,
} from "./geometry";

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

describe("catmullRom", () => {
  it("returns p1 at t=0", () => {
    const p0 = new Vector(0, 0);
    const p1 = new Vector(1, 2);
    const p2 = new Vector(3, 4);
    const p3 = new Vector(5, 6);
    const result = catmullRom(p0, p1, p2, p3, 0);
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(2);
  });

  it("returns p2 at t=1", () => {
    const p0 = new Vector(0, 0);
    const p1 = new Vector(1, 2);
    const p2 = new Vector(3, 4);
    const p3 = new Vector(5, 6);
    const result = catmullRom(p0, p1, p2, p3, 1);
    expect(result.x).toBeCloseTo(3);
    expect(result.y).toBeCloseTo(4);
  });

  it("passes through midpoint smoothly for collinear points", () => {
    // Evenly spaced collinear points — midpoint should be the average of p1 and p2
    const p0 = new Vector(0, 0);
    const p1 = new Vector(1, 0);
    const p2 = new Vector(2, 0);
    const p3 = new Vector(3, 0);
    const mid = catmullRom(p0, p1, p2, p3, 0.5);
    expect(mid.x).toBeCloseTo(1.5);
    expect(mid.y).toBeCloseTo(0);
  });

  it("curves smoothly for non-collinear points", () => {
    // Triangle-like: (0,0) -> (0.5,1) -> (1,0) with surrounding context
    const p0 = new Vector(-0.5, -1);
    const p1 = new Vector(0, 0);
    const p2 = new Vector(0.5, 1);
    const p3 = new Vector(1, 0);
    const mid = catmullRom(p0, p1, p2, p3, 0.5);
    // Should be between p1 and p2, but the curve is influenced by p0 and p3
    expect(mid.x).toBeCloseTo(0.25);
    // y should be close to 0.5 (linear midpoint) but may differ due to curvature
    expect(mid.y).toBeGreaterThan(0);
    expect(mid.y).toBeLessThan(1);
  });
});

describe("catmullRomAngle", () => {
  it("returns a1 at t=0", () => {
    expect(catmullRomAngle(0, PI / 2, PI, (3 * PI) / 2, 0)).toBeCloseTo(PI / 2);
  });

  it("returns a2 at t=1", () => {
    expect(catmullRomAngle(0, PI / 2, PI, (3 * PI) / 2, 1)).toBeCloseTo(PI);
  });

  it("interpolates linearly for evenly spaced angles", () => {
    const mid = catmullRomAngle(0, PI / 4, PI / 2, (3 * PI) / 4, 0.5);
    expect(mid).toBeCloseTo((3 * PI) / 8);
  });

  it("handles wraparound across ±π boundary", () => {
    // Angles near ±π: going from 3π/4 to -3π/4 (i.e. crossing the ±π boundary)
    const a0 = PI / 2;
    const a1 = (3 * PI) / 4;
    const a2 = -(3 * PI) / 4; // = 5π/4 going the short way
    const a3 = -PI / 2;
    const mid = catmullRomAngle(a0, a1, a2, a3, 0.5);
    // Should cross through ±π, midpoint ≈ π (or -π, same angle)
    expect(Math.abs(Math.abs(mid) - PI)).toBeLessThan(0.1);
  });
});
