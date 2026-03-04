import { enableMapSet } from "immer";
import { describe, expect, it } from "vitest";

enableMapSet();

import { ALL_PROTO_IDS, isLark, type ProtoId } from "../contraCore";
import { ccwRadsBetween, PI } from "../geometry";
import { animateSegments } from "./_segment";
import { initFormationStates } from "./index";
import { type TurnAloneInstruction, turnAloneSegments } from "./turnAlone";

const allProtos = new Set<ProtoId>(ALL_PROTO_IDS);

function makeInstr(
  overrides: Partial<TurnAloneInstruction> = {},
): TurnAloneInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 2,
    type: "turn_alone",
    ...overrides,
  };
}

describe("turnAlone", () => {
  const init = initFormationStates.improper;
  const instr = makeInstr();
  const animation = animateSegments(init, allProtos, turnAloneSegments(instr, init, allProtos));
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
