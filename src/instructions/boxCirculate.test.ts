import { describe, it } from "vitest";

// Tests removed: relied on removed segment-based APIs (boxCirculateSegments, formLongWavesSegments, getSegmentFrameAtFrac).
// TODO: rewrite using plan-based API.
describe.skip("boxCirculate", () => {
  it("moves across-facing dancers in_front, out-facing dancers to right-hand partner", () => {});
  it("out-facing dancers travel in a clockwise semicircle", () => {});
  it("throws if a dancer faces neither out nor across", () => {});
});
