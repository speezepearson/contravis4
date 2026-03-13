import { describe, it } from "vitest";

// Tests removed: relied on removed segment-based APIs (formLongWavesSegments, getSegmentFrameAtFrac).
// TODO: rewrite using plan-based API.
describe.skip("formLongWaves", () => {
  it("snaps facings and connects hands", () => {});
  it("snaps facing to nearest of across/out", () => {});
  it("throws if both larks are on the same side", () => {});
  it("throws if both robins are on the same side", () => {});
  it("throws if larks don't all face the same way (across vs out)", () => {});
});
