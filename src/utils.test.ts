import { describe, expect, it } from "vitest";

import { smallestCrossDyToMakeAlignByMultOfTwo } from "./utils";

describe("smallestCrossDyToMakeAlignByMultOfTwo", () => {
  it("returns 0 when a and b are already aligned", () => {
    expect(smallestCrossDyToMakeAlignByMultOfTwo(0, 0)).toBe(0);
    expect(smallestCrossDyToMakeAlignByMultOfTwo(0, 2)).toBe(0);
    expect(smallestCrossDyToMakeAlignByMultOfTwo(2, 0)).toBe(0);
    expect(smallestCrossDyToMakeAlignByMultOfTwo(3, 5)).toBe(0);
  });

  it("returns 0.5 when a and b differ by an odd number", () => {
    // a=0,b=1: x=0.5 => 0.5 and 0.5, diff=0 ✓
    expect(smallestCrossDyToMakeAlignByMultOfTwo(0, 1)).toBe(0.5);
    // a=0,b=3: x=0.5 => 0.5 and 2.5, diff=-2 ✓
    expect(smallestCrossDyToMakeAlignByMultOfTwo(0, 3)).toBe(0.5);
    // a=1,b=0: x=0.5 => 1.5 and -0.5, diff=2 ✓
    expect(smallestCrossDyToMakeAlignByMultOfTwo(1, 0)).toBe(0.5);
  });

  it("handles fractional inputs", () => {
    // a=0.5,b=0: halfDiff=0.25, x = 0-0.25 = -0.25
    // check: 0.25 and 0.25, diff=0 ✓
    expect(smallestCrossDyToMakeAlignByMultOfTwo(0.5, 0)).toBe(-0.25);
    // a=0,b=0.5: halfDiff=-0.25, x = 0+0.25 = 0.25
    expect(smallestCrossDyToMakeAlignByMultOfTwo(0, 0.5)).toBe(0.25);
  });

  it("returns the smallest magnitude result", () => {
    // a=0.3,b=0.7: halfDiff=-0.2, x = 0+0.2 = 0.2
    // check: 0.5 and 0.5, diff=0 ✓
    expect(smallestCrossDyToMakeAlignByMultOfTwo(0.3, 0.7)).toBeCloseTo(0.2);
  });

  it("result always satisfies the invariant", () => {
    const cases = [
      [0, 0],
      [0, 1],
      [1, 0],
      [0, 2],
      [3, 5],
      [0.5, 0],
      [0, 0.5],
      [1.3, 2.7],
      [-1, 3],
    ];
    for (const [a, b] of cases) {
      const x = smallestCrossDyToMakeAlignByMultOfTwo(a, b);
      const diff = a + x - (b - x);
      expect(diff / 2).toBeCloseTo(Math.round(diff / 2));
    }
  });
});
