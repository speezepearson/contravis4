import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { circularDistance } from "../utils";
import { computeEvenSpacingFudge } from "./_fudge";

describe("computeEvenSpacingFudge", () => {
  it("produces circular distance 1 for any two y values", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10, max: 10, noNaN: true }),
        fc.double({ min: -10, max: 10, noNaN: true }),
        (y1, y2) => {
          const [dy1, dy2] = computeEvenSpacingFudge(y1, y2);
          const newDist = circularDistance(y1 + dy1, y2 + dy2, 2);
          expect(newDist).toBeCloseTo(1, 10);
        },
      ),
    );
  });

  it("fudges are equal and opposite", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10, max: 10, noNaN: true }),
        fc.double({ min: -10, max: 10, noNaN: true }),
        (y1, y2) => {
          const [dy1, dy2] = computeEvenSpacingFudge(y1, y2);
          expect(dy1 + dy2).toBeCloseTo(0, 10);
        },
      ),
    );
  });

  it("returns zero fudge when already spaced correctly", () => {
    const [dy1, dy2] = computeEvenSpacingFudge(0, 1);
    expect(dy1).toBeCloseTo(0, 10);
    expect(dy2).toBeCloseTo(0, 10);
  });

  it("matches the worked example from the spec", () => {
    // West side: y=0, y=1.5 → fudge to y=0.25, y=1.25
    const [dyW1, dyW2] = computeEvenSpacingFudge(0, 1.5);
    expect(0 + dyW1).toBeCloseTo(0.25, 10);
    expect(1.5 + dyW2).toBeCloseTo(1.25, 10);

    // East side: y=1.9, y=0.3 → fudge to y=1.6, y=0.6
    const [dyE1, dyE2] = computeEvenSpacingFudge(1.9, 0.3);
    expect(1.9 + dyE1).toBeCloseTo(1.6, 10);
    expect(0.3 + dyE2).toBeCloseTo(0.6, 10);
  });
});
