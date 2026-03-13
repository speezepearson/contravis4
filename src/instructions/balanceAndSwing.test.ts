import { describe, it } from "vitest";

// Tests removed: relied on removed segment-based APIs (balanceAndSwingSegments, animateSegments, getSegmentFrameAtFrac).
// TODO: rewrite using plan-based API.
describe.skip("balanceAndSwing", () => {
  it("segment durations sum to total beats", () => {});
  it("produces a valid animation from improper", () => {});
  it("ends with all dancers having moved from starting position", () => {});
});
