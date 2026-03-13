import { describe, it } from "vitest";

// Tests removed: relied on removed segment-based APIs (swingSegments, animateSegments).
// TODO: rewrite using plan-based API.
describe.skip("robin disengage rotation", () => {
  it("robin disengage should be at most a half turn in 16-beat neighbor swing", () => {});
});

describe.skip("swing approach/orbit speed matching", () => {
  for (const distance of [0.25, 0.5, 1.0, 1.5]) {
    it(`velocity is smooth at approach→swing boundary (distance=${distance}m)`, () => {});
  }
});

describe.skip("swing endFacing=across snaps to half-integer grid", () => {
  it("every dancer ends at x=±0.5 and y=multiple of 0.5", () => {});
});

describe.skip("post-swing alignment", () => {
  it("larks draw partners and end facing across → end up across from expected", () => {});
});
