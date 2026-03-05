import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { smallestCrossDyToMakeAlignByMultOfTwo } from "./utils";

describe("smallestCrossDyToMakeAlignByMultOfTwo", () => {
  const fcNum = fc.double({ noNaN: true, min: -100, max: 100 });

  it("returns 0 when a and b are already aligned", () => {
    expect(smallestCrossDyToMakeAlignByMultOfTwo(0, 0)).toBe(0);
    expect(smallestCrossDyToMakeAlignByMultOfTwo(0, 2)).toBe(0);
    expect(smallestCrossDyToMakeAlignByMultOfTwo(2, 0)).toBe(0);
    expect(smallestCrossDyToMakeAlignByMultOfTwo(3, 5)).toBe(0);
  });

  it("throws when a and b differ by an odd number", () => {
    expect(() => smallestCrossDyToMakeAlignByMultOfTwo(0, 1)).toThrow();
    expect(() => smallestCrossDyToMakeAlignByMultOfTwo(0, 3)).toThrow();
    expect(() => smallestCrossDyToMakeAlignByMultOfTwo(1, 0)).toThrow();
  });

  it("handles fractional inputs", () => {
    // a=0.5,b=0: halfDiff=0.25, x = 0-0.25 = -0.25
    // check: 0.25 and 0.25, diff=0 ✓
    expect(smallestCrossDyToMakeAlignByMultOfTwo(0.5, 0)).toBe(-0.25);
    // a=0,b=0.5: halfDiff=-0.25, x = 0+0.25 = 0.25
    expect(smallestCrossDyToMakeAlignByMultOfTwo(0, 0.5)).toBe(0.25);
  });

  it("returns the smallest magnitude result", () => {
    fc.assert(
      fc.property(fcNum, fcNum, (a, b) => {
        let x: number;
        try {
          x = smallestCrossDyToMakeAlignByMultOfTwo(a, b);
        } catch {
          return; // throwing is acceptable
        }
        expect(Math.abs(x)).toBeLessThanOrEqual(0.5);
      }),
    );
  });

  it("result always satisfies the invariant", () => {
    // Range capped to avoid floating-point overflow in the invariant check (a - b + 2x).
    fc.assert(
      fc.property(fcNum, fcNum, (a, b) => {
        let x: number;
        try {
          x = smallestCrossDyToMakeAlignByMultOfTwo(a, b);
        } catch {
          return; // throwing is acceptable
        }
        const diff = a + x - (b - x);
        expect(diff / 2).toBeCloseTo(Math.round(diff / 2));
      }),
    );
  });
});
