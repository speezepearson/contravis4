import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../contraCore";
import { labelId } from "../identifiers";
import { type WorldState } from "../worldState";
import { animateSegments, getSegmentFrameAtFrac } from "./_segment";
import { initFormationStates } from "./index";
import {
  type SquareThroughInstruction,
  squareThroughSegments,
} from "./squareThrough";

const allProtos = ALL_PROTO_IDS_SET;

const baseInstr = {
  id: "00000000-0000-0000-0000-000000000001",
  type: "square_through" as const,
  firstHand: "right" as const,
  cid1: labelId("neighbor"),
  cid2: labelId("partner"),
};

const instr4: SquareThroughInstruction = {
  ...baseInstr,
  beats: 16,
  nPullBys: 4,
};

const instr3: SquareThroughInstruction = {
  ...baseInstr,
  beats: 12,
  nPullBys: 3,
};

const instr2: SquareThroughInstruction = {
  ...baseInstr,
  beats: 8,
  nPullBys: 2,
};

describe("squareThrough", () => {
  describe.each([
    { label: "n=4", instr: instr4 },
    { label: "n=3", instr: instr3 },
    { label: "n=2", instr: instr2 },
  ])("$label", ({ instr }) => {
    it("segment durations sum to total beats", () => {
      const init = initFormationStates.improper;
      const segments = squareThroughSegments(instr, init, allProtos);
      const totalDur = segments.reduce((sum, s) => sum + s.dur, 0);
      expect(totalDur).toBe(instr.beats);
    });

    it("produces a valid animation from improper", () => {
      const init = initFormationStates.improper;
      const segments = squareThroughSegments(instr, init, allProtos);

      const anim = animateSegments(init, allProtos, segments);
      expect(anim.dur).toBe(instr.beats);

      for (let t = 0; t <= anim.dur; t += 0.5) {
        anim.getFrame(t);
      }
    });

    it("ends with all dancers having moved from starting position unless n=4", () => {
      const init = initFormationStates.improper;
      const segments = squareThroughSegments(instr, init, allProtos);

      let state: WorldState = init;
      for (const seg of segments) {
        state = getSegmentFrameAtFrac(seg, state, allProtos, 1);
      }

      for (const id of ALL_PROTO_IDS) {
        const moved =
          Math.abs(state[id].pos.x - init[id].pos.x) > 0.1 ||
          Math.abs(state[id].pos.y - init[id].pos.y) > 0.1;
        const expectMoved = instr.nPullBys !== 4;
        expect(
          moved,
          `${id} should ${expectMoved ? "have" : "not have"} moved from starting position`,
        ).toBe(expectMoved);
      }
    });
  });
});
