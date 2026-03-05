import { enableMapSet } from "immer";
import { describe, expect, it } from "vitest";

enableMapSet();

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../contraCore";
import { EAST, WEST } from "../geometry";
import { animateSegments } from "./_segment";
import { initFormationStates } from "./index";
import { type PoussetteInstruction, poussetteSegments } from "./poussette";

const allProtos = ALL_PROTO_IDS_SET;

function makeInstr(
  overrides: Partial<PoussetteInstruction> = {},
): PoussetteInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 8,
    type: "poussette",
    backer: "lark",
    backerDir: "right",
    full: false,
    ...overrides,
  };
}

describe("poussette", () => {
  describe("half poussette (backer=lark, backerDir=right)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr();
    const segments = poussetteSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);
    const final = animation.getFrame(animation.dur);

    it("all dancers face across throughout", () => {
      // Facing is set to "across" at setup based on initial position, then stays constant
      for (const t of [0, instr.beats / 2, instr.beats]) {
        const frame = animation.getFrame(t);
        for (const id of ALL_PROTO_IDS) {
          const facing = frame[id].facing;
          // Facing is determined by initial side, not current position
          const expectedFacing = init[id].pos.x < 0 ? EAST : WEST;
          expect(facing.x, `${id} at t=${t}`).toBeCloseTo(expectedFacing.x);
          expect(facing.y, `${id} at t=${t}`).toBeCloseTo(expectedFacing.y);
        }
      }
    });

    it("both dancers in each pair hold both hands", () => {
      for (const t of [0, instr.beats / 2, instr.beats]) {
        const frame = animation.getFrame(t);
        // up_lark and up_robin are paired across
        expect(frame.up_lark_0.hands.right?.theirId).toBe("up_robin_0");
        expect(frame.up_lark_0.hands.right?.theirHand).toBe("left");
        expect(frame.up_lark_0.hands.left?.theirId).toBe("up_robin_0");
        expect(frame.up_lark_0.hands.left?.theirHand).toBe("right");

        expect(frame.up_robin_0.hands.right?.theirId).toBe("up_lark_0");
        expect(frame.up_robin_0.hands.right?.theirHand).toBe("left");
        expect(frame.up_robin_0.hands.left?.theirId).toBe("up_lark_0");
        expect(frame.up_robin_0.hands.left?.theirHand).toBe("right");
      }
    });

    it("each pair moves together maintaining displacement", () => {
      // The non-backer should always be the same displacement from the backer
      const initDisplacement = init.up_robin_0.pos.subtract(init.up_lark_0.pos);
      for (const t of [0, instr.beats / 4, instr.beats / 2, instr.beats]) {
        const frame = animation.getFrame(t);
        const displacement = frame.up_robin_0.pos.subtract(frame.up_lark_0.pos);
        expect(displacement.x, `x displacement at t=${t}`).toBeCloseTo(
          initDisplacement.x,
        );
        expect(displacement.y, `y displacement at t=${t}`).toBeCloseTo(
          initDisplacement.y,
        );
      }
    });

    it("backers move one unit along the line after half poussette", () => {
      // With backerDir=right: up_lark faces east, right=south, so moves south
      // up_lark starts at (-0.5, -0.5), arc partner is 1 unit south
      // After PI radians, should be at the arc partner's position
      expect(final.up_lark_0.pos.y).toBeCloseTo(init.up_lark_0.pos.y - 1);
      expect(final.up_lark_0.pos.x).toBeCloseTo(init.up_lark_0.pos.x);

      // down_lark faces west, right=north, so moves north
      expect(final.down_lark_0.pos.y).toBeCloseTo(init.down_lark_0.pos.y + 1);
      expect(final.down_lark_0.pos.x).toBeCloseTo(init.down_lark_0.pos.x);
    });

    it("non-backers follow their backers", () => {
      // up_robin should also have moved 1 unit south
      expect(final.up_robin_0.pos.y).toBeCloseTo(init.up_robin_0.pos.y - 1);
      expect(final.up_robin_0.pos.x).toBeCloseTo(init.up_robin_0.pos.x);

      // down_robin should also have moved 1 unit north
      expect(final.down_robin_0.pos.y).toBeCloseTo(init.down_robin_0.pos.y + 1);
      expect(final.down_robin_0.pos.x).toBeCloseTo(init.down_robin_0.pos.x);
    });

    it("at midpoint, backer swings toward center of set", () => {
      const mid = animation.getFrame(instr.beats / 2);
      // up_lark should swing toward x=0 at midpoint
      expect(Math.abs(mid.up_lark_0.pos.x)).toBeLessThan(
        Math.abs(init.up_lark_0.pos.x),
      );
    });
  });

  describe("full poussette", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ full: true });
    const segments = poussetteSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);
    const final = animation.getFrame(animation.dur);

    it("returns dancers to starting positions after full circle", () => {
      for (const id of ALL_PROTO_IDS) {
        // After phi=TWO_PI, the arc returns to start
        // So positions should be back where they started (after facing across)
        // The setup faces across but doesn't change positions, so check original pos
        expect(final[id].pos.x, `${id} x`).toBeCloseTo(init[id].pos.x);
        expect(final[id].pos.y, `${id} y`).toBeCloseTo(init[id].pos.y);
      }
    });
  });

  describe("backerDir=left", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ backerDir: "left" });
    const segments = poussetteSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);
    const final = animation.getFrame(animation.dur);

    it("moves in the opposite direction compared to backerDir=right", () => {
      // With backerDir=left: up_lark faces east, left=north, moves north
      expect(final.up_lark_0.pos.y).toBeCloseTo(init.up_lark_0.pos.y + 1);
      // down_lark faces west, left=south, moves south
      expect(final.down_lark_0.pos.y).toBeCloseTo(init.down_lark_0.pos.y - 1);
    });
  });
});
