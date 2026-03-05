import { enableMapSet } from "immer";
import { describe, expect, it } from "vitest";

enableMapSet();

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../contraCore";
import { animateSegments } from "./_segment";
import { initFormationStates } from "./index";
import { type ZigZagInstruction, zigZagSegments } from "./zigZag";

const allProtos = ALL_PROTO_IDS_SET;

function makeInstr(
  overrides: Partial<ZigZagInstruction> = {},
): ZigZagInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 8,
    type: "zig_zag",
    leader: "lark",
    leaderDir: "right",
    nZigs: 2,
    ...overrides,
  };
}

describe("zigZag", () => {
  describe("nZigs=2 (leader=lark, leaderDir=right)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr();
    const segments = zigZagSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);
    const final = animation.getFrame(animation.dur);

    it("returns dancers to starting positions after 2 zigs", () => {
      for (const id of ALL_PROTO_IDS) {
        expect(final[id].pos.x, `${id} x`).toBeCloseTo(init[id].pos.x);
        expect(final[id].pos.y, `${id} y`).toBeCloseTo(init[id].pos.y);
      }
    });

    it("leader and follower face the same direction throughout", () => {
      for (const t of [0, instr.beats / 4, instr.beats / 2, instr.beats]) {
        const frame = animation.getFrame(t);
        // up pair should face the same way
        expect(frame.up_lark_0.facing.x).toBeCloseTo(frame.up_robin_0.facing.x);
        expect(frame.up_lark_0.facing.y).toBeCloseTo(frame.up_robin_0.facing.y);
        // down pair should face the same way
        expect(frame.down_lark_0.facing.x).toBeCloseTo(
          frame.down_robin_0.facing.x,
        );
        expect(frame.down_lark_0.facing.y).toBeCloseTo(
          frame.down_robin_0.facing.y,
        );
      }
    });

    it("facing stays constant throughout", () => {
      const t0 = animation.getFrame(0);
      for (const t of [instr.beats / 4, instr.beats / 2, instr.beats]) {
        const frame = animation.getFrame(t);
        for (const id of ALL_PROTO_IDS) {
          expect(frame[id].facing.x, `${id} facing.x at t=${t}`).toBeCloseTo(
            t0[id].facing.x,
          );
          expect(frame[id].facing.y, `${id} facing.y at t=${t}`).toBeCloseTo(
            t0[id].facing.y,
          );
        }
      }
    });

    it("only inside hands are held", () => {
      const frame = animation.getFrame(instr.beats / 2);
      // leaderDir=right → leader's inside hand = left, follower's inside = right
      // up_lark (leader): left hand holds up_robin's right
      expect(frame.up_lark_0.hands.left?.theirId).toBe("up_robin_0");
      expect(frame.up_lark_0.hands.left?.theirHand).toBe("right");
      expect(frame.up_lark_0.hands.right).toBeUndefined();
      // up_robin (follower): right hand holds up_lark's left
      expect(frame.up_robin_0.hands.right?.theirId).toBe("up_lark_0");
      expect(frame.up_robin_0.hands.right?.theirHand).toBe("left");
      expect(frame.up_robin_0.hands.left).toBeUndefined();
    });

    it("each pair moves together at segment boundaries", () => {
      const initDisplacement = init.up_robin_0.pos.subtract(init.up_lark_0.pos);
      // Displacement is fully maintained at segment boundaries (frac=0 and frac=1);
      // it breathes (shrinks slightly) mid-arc.
      const beatsPerZig = instr.beats / 2;
      for (const t of [0, beatsPerZig, instr.beats]) {
        const frame = animation.getFrame(t);
        const displacement = frame.up_robin_0.pos.subtract(frame.up_lark_0.pos);
        expect(displacement.x, `x at t=${t}`).toBeCloseTo(initDisplacement.x);
        expect(displacement.y, `y at t=${t}`).toBeCloseTo(initDisplacement.y);
      }
    });

    it("moves along the line at mid-zig", () => {
      // At 1/4 through (mid-first-zig), couple should have moved along the line
      const quarter = animation.getFrame(instr.beats / 4);
      // up_lark should have moved in y (south for leaderDir=right)
      expect(quarter.up_lark_0.pos.y).not.toBeCloseTo(init.up_lark_0.pos.y);
    });
  });

  describe("nZigs=1", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ nZigs: 1 });
    const segments = zigZagSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);
    const final = animation.getFrame(animation.dur);

    it("moves dancers one unit along the line", () => {
      // Same as a half poussette
      expect(final.up_lark_0.pos.y).toBeCloseTo(init.up_lark_0.pos.y - 1);
      expect(final.up_lark_0.pos.x).toBeCloseTo(init.up_lark_0.pos.x);
    });
  });

  describe("nZigs=4", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ nZigs: 4, beats: 16 });
    const segments = zigZagSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);
    const final = animation.getFrame(animation.dur);

    it("returns dancers to starting positions after 4 zigs", () => {
      for (const id of ALL_PROTO_IDS) {
        expect(final[id].pos.x, `${id} x`).toBeCloseTo(init[id].pos.x);
        expect(final[id].pos.y, `${id} y`).toBeCloseTo(init[id].pos.y);
      }
    });
  });

  describe("leaderDir=left", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ leaderDir: "left", nZigs: 1 });
    const segments = zigZagSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);
    const final = animation.getFrame(animation.dur);

    it("moves in the opposite direction compared to leaderDir=right", () => {
      // leaderDir=left: up_lark faces east, on_left=north, moves north
      expect(final.up_lark_0.pos.y).toBeCloseTo(init.up_lark_0.pos.y + 1);
    });

    it("only inside hands are held (mirrored)", () => {
      const frame = animation.getFrame(0);
      // leaderDir=left → leader's inside hand = right, follower's inside = left
      expect(frame.up_lark_0.hands.right?.theirId).toBe("up_robin_0");
      expect(frame.up_lark_0.hands.right?.theirHand).toBe("left");
      expect(frame.up_lark_0.hands.left).toBeUndefined();
    });
  });
});
