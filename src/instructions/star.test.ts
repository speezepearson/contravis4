import { produce } from "immer";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../contraCore";
import { labelId } from "../identifiers";
import { initFormationStates } from "./index";
import { starAnimator, type StarInstruction } from "./star";

const allProtos = ALL_PROTO_IDS_SET;

function makeInstr(overrides: Partial<StarInstruction> = {}): StarInstruction {
  return {
    beats: 8,
    type: "star",
    direction: "left",
    nPlaces: 4,
    ...overrides,
  };
}

describe("star", () => {
  it("full rotation returns dancers to starting positions", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "left", nPlaces: 4 });
    const animation = starAnimator(instr, init, allProtos);
    const final = animation.getFrame(animation.dur);

    for (const id of ALL_PROTO_IDS) {
      expect(final[id].pos.x).toBeCloseTo(init[id].pos.x);
      expect(final[id].pos.y).toBeCloseTo(init[id].pos.y);
    }
  });

  it("direction=right orbits clockwise (quarter turn)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "right", nPlaces: 1 });
    const animation = starAnimator(instr, init, allProtos);
    const final = animation.getFrame(animation.dur);

    // Same positions as circle right 1 place
    expect(final.up_lark_0.pos.x).toBeCloseTo(-0.5);
    expect(final.up_lark_0.pos.y).toBeCloseTo(0.5);

    expect(final.up_robin_0.pos.x).toBeCloseTo(-0.5);
    expect(final.up_robin_0.pos.y).toBeCloseTo(-0.5);
  });

  it("direction=left orbits counter-clockwise (quarter turn)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "left", nPlaces: 1 });
    const animation = starAnimator(instr, init, allProtos);
    const final = animation.getFrame(animation.dur);

    expect(final.up_lark_0.pos.x).toBeCloseTo(0.5);
    expect(final.up_lark_0.pos.y).toBeCloseTo(-0.5);
  });

  it("facing is rotated 90° from circle facing (left star)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "left", nPlaces: 1 });
    const animation = starAnimator(instr, init, allProtos);
    // Check at midpoint: facings should be tangential, not center-facing
    const mid = animation.getFrame(animation.dur / 2);

    // In a left star, facing is rotated CCW from center-facing,
    // so dancers face in their direction of travel
    // Just check that facing is not pointing at center
    for (const id of ALL_PROTO_IDS) {
      const toCenter = mid[id].pos.multiply(-1).normalize();
      const dot = mid[id].facing.dot(toCenter);
      // Should NOT be facing center (dot ≈ 1), should be roughly perpendicular (dot ≈ 0)
      expect(Math.abs(dot)).toBeLessThan(0.5);
    }
  });

  it("inside hand connects with opposite person (left star = left hand)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "left", nPlaces: 2 });
    const animation = starAnimator(instr, init, allProtos);
    const mid = animation.getFrame(animation.dur / 2);

    for (const id of ALL_PROTO_IDS) {
      // In a left star, left hand should be connected
      expect(mid[id].hands.left, `${id} should have left hand`).toBeDefined();
      // Right hand should NOT be connected
      expect(
        mid[id].hands.right,
        `${id} should not have right hand`,
      ).toBeUndefined();
    }
  });

  it("disambiguatingCid resolves ambiguity in becket", () => {
    // In becket with empty recents, getGroupOfFour is ambiguous.
    // The disambiguatingCid hint should resolve this.
    const becketNoRecents = produce(initFormationStates.becket, (draft) => {
      for (const id of ALL_PROTO_IDS) draft[id].recents = [];
    });

    // Without hint, should throw due to ambiguity
    expect(() =>
      starAnimator(makeInstr(), becketNoRecents, allProtos),
    ).toThrow();

    // With hint "partner", should succeed
    const instr = makeInstr({ disambiguatingCid: labelId("partner") });
    const animation = starAnimator(instr, becketNoRecents, allProtos);
    const final = animation.getFrame(animation.dur);

    // Full rotation (4 places) should return dancers to starting positions
    for (const id of ALL_PROTO_IDS) {
      expect(final[id].pos.x).toBeCloseTo(becketNoRecents[id].pos.x);
      expect(final[id].pos.y).toBeCloseTo(becketNoRecents[id].pos.y);
    }
  });

  it("inside hand connects with opposite person (right star = right hand)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "right", nPlaces: 2 });
    const animation = starAnimator(instr, init, allProtos);
    const mid = animation.getFrame(animation.dur / 2);

    for (const id of ALL_PROTO_IDS) {
      // In a right star, right hand should be connected
      expect(mid[id].hands.right, `${id} should have right hand`).toBeDefined();
      // Left hand should NOT be connected
      expect(
        mid[id].hands.left,
        `${id} should not have left hand`,
      ).toBeUndefined();
    }
  });
});
