import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../contraCore";
import { labelId } from "../identifiers";
import { type WorldState } from "../worldState";
import { animateSegments, getSegmentFrameAtFrac } from "./_segment";
import {
  type BalanceAndSwingInstruction,
  balanceAndSwingSegments,
} from "./balanceAndSwing";
import { initFormationStates } from "./index";

const allProtos = ALL_PROTO_IDS_SET;

const instr: BalanceAndSwingInstruction = {
  id: "00000000-0000-0000-0000-000000000001",
  beats: 16,
  type: "balance_and_swing",
  cid: labelId("neighbor"),
  endFacing: "across",
};

describe("balanceAndSwing", () => {
  it("segment durations sum to total beats", () => {
    const init = initFormationStates.improper;
    const segments = balanceAndSwingSegments(instr, init, allProtos);
    const totalDur = segments.reduce((sum, s) => sum + s.dur, 0);
    expect(totalDur).toBe(16);
  });

  it("produces a valid animation from improper", () => {
    const init = initFormationStates.improper;
    const segments = balanceAndSwingSegments(instr, init, allProtos);

    const anim = animateSegments(init, allProtos, segments);
    expect(anim.dur).toBe(16);

    // Sample frames across the animation — should not throw
    for (let t = 0; t <= anim.dur; t += 0.5) {
      anim.getFrame(t);
    }
  });

  it("ends with all dancers having moved from starting position", () => {
    const init = initFormationStates.improper;
    const segments = balanceAndSwingSegments(instr, init, allProtos);

    let state: WorldState = init;
    for (const seg of segments) {
      state = getSegmentFrameAtFrac(seg, state, allProtos, 1);
    }

    for (const id of ALL_PROTO_IDS) {
      const moved =
        Math.abs(state[id].pos.x - init[id].pos.x) > 0.01 ||
        Math.abs(state[id].pos.y - init[id].pos.y) > 0.01;
      expect(moved, `${id} should have moved from starting position`).toBe(
        true,
      );
    }
  });
});
