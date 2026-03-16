import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET, isLark } from "../contraCore";
import { ccwRadsBetween, PI } from "../geometry";
import { initFormationStates } from "./index";
import { turnAloneAnimator, type TurnAloneInstruction } from "./turnAlone";

const allProtos = ALL_PROTO_IDS_SET;

function makeInstr(
  overrides: Partial<TurnAloneInstruction> = {},
): TurnAloneInstruction {
  return {
    beats: 2,
    type: "turn_alone",
    ...overrides,
  };
}

describe("turnAlone", () => {
  const init = initFormationStates.improper;
  const instr = makeInstr();
  const animation = turnAloneAnimator(instr, init, allProtos);
  const final = animation.getFrame(animation.dur);

  it("does not move dancers' positions", () => {
    for (const id of ALL_PROTO_IDS) {
      expect(final[id].pos.x).toBeCloseTo(init[id].pos.x);
      expect(final[id].pos.y).toBeCloseTo(init[id].pos.y);
    }
  });

  it("rotates larks CW by 180 degrees", () => {
    for (const id of ALL_PROTO_IDS) {
      if (!isLark(id)) continue;
      // CW = negative radians in standard math orientation
      // Final facing should be opposite of initial facing
      const angleDiff = ccwRadsBetween(init[id].facing, final[id].facing);
      expect(Math.abs(Math.abs(angleDiff) - PI)).toBeLessThan(0.01);
    }
  });

  it("rotates robins CCW by 180 degrees", () => {
    for (const id of ALL_PROTO_IDS) {
      if (isLark(id)) continue;
      const angleDiff = ccwRadsBetween(init[id].facing, final[id].facing);
      expect(Math.abs(Math.abs(angleDiff) - PI)).toBeLessThan(0.01);
    }
  });

  it("defaults to 2 beats", () => {
    expect(animation.dur).toBe(2);
  });
});
