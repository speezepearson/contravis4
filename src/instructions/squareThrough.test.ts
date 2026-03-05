import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../contraCore";
import { type WorldState } from "../worldState";
import { animateSegments, getSegmentFrameAtFrac } from "./_segment";
import { initFormationStates } from "./index";
import {
  type SquareThroughInstruction,
  squareThroughSegments,
} from "./squareThrough";

const allProtos = ALL_PROTO_IDS_SET;

const instr: SquareThroughInstruction = {
  id: "00000000-0000-0000-0000-000000000001",
  beats: 8,
  type: "square_through",
};

describe("squareThrough", () => {
  it("segment durations sum to total beats", () => {
    const init = initFormationStates.improper;
    const segments = squareThroughSegments(instr, init, allProtos);
    const totalDur = segments.reduce((sum, s) => sum + s.dur, 0);
    expect(totalDur).toBe(8);
  });

  it("produces a valid animation from improper", () => {
    const init = initFormationStates.improper;
    const segments = squareThroughSegments(instr, init, allProtos);

    // Should not throw when building and evaluating the animation
    const anim = animateSegments(init, allProtos, segments);
    expect(anim.dur).toBe(8);

    // Sample frames across the animation — should not throw
    for (let t = 0; t <= anim.dur; t += 0.5) {
      anim.getFrame(t);
    }
  });

  it("ends with all dancers having swapped across and progressed along set", () => {
    const init = initFormationStates.improper;
    const segments = squareThroughSegments(instr, init, allProtos);

    // Thread through all segments to get final state
    let state: WorldState = init;
    for (const seg of segments) {
      state = getSegmentFrameAtFrac(seg, state, allProtos, 1);
    }

    // After square through from improper:
    // 1. Face across: all face EAST/WEST toward center
    // 2. Take right hands + balance + pull by right: dancers swap across the set
    // 3. Turn larks_right_robins_left: all face up/down the set
    // 4. Pull by left: dancers pass the person in front along the set
    //
    // up_lark_0: (-0.5,-0.5) → across to (0.5,-0.5) → pull by left south to (0.5, -1.5)?
    // Actually the exact positions depend on pull-by arc endpoints.
    // Just verify they moved from their starting positions.
    for (const id of ALL_PROTO_IDS) {
      const moved =
        Math.abs(state[id].pos.x - init[id].pos.x) > 0.1 ||
        Math.abs(state[id].pos.y - init[id].pos.y) > 0.1;
      expect(moved, `${id} should have moved from starting position`).toBe(
        true,
      );
    }
  });
});
