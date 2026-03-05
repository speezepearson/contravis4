import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET, getRole } from "../contraCore";
import { EAST, WEST } from "../geometry";
import { fcHand,fcRole } from "../testHelpers";
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

    it("each pair moves together at segment boundaries", () => {
      // Displacement is fully maintained at segment boundaries (frac=0 and frac=1);
      // it breathes (shrinks slightly) mid-arc.
      const initDisplacement = init.up_robin_0.pos.subtract(init.up_lark_0.pos);
      for (const t of [0, instr.beats]) {
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

    it("at midpoint, backer swings away from center of set", () => {
      const mid = animation.getFrame(instr.beats / 2);
      // up_lark should swing away from x=0 (outward) at midpoint
      expect(Math.abs(mid.up_lark_0.pos.x)).toBeGreaterThan(
        Math.abs(init.up_lark_0.pos.x),
      );
    });
  });

  describe("full poussette (backer=lark, backerDir=left)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ full: true, backerDir: "left" });
    const segments = poussetteSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);
    const final = animation.getFrame(animation.dur);

    it("returns every dancer to starting position", () => {
      for (const id of ALL_PROTO_IDS) {
        expect(final[id].pos.x, `${id} x`).toBeCloseTo(init[id].pos.x);
        expect(final[id].pos.y, `${id} y`).toBeCloseTo(init[id].pos.y);
      }
    });

    it("every dancer crosses the center line during the figure", () => {
      // Each dancer should be at x<0 at some point and x>0 at some point
      for (const id of ALL_PROTO_IDS) {
        let seenNegX = false;
        let seenPosX = false;
        for (let t = 0; t <= instr.beats; t += 0.25) {
          const frame = animation.getFrame(t);
          if (frame[id].pos.x < -0.01) seenNegX = true;
          if (frame[id].pos.x > 0.01) seenPosX = true;
        }
        expect(seenNegX, `${id} should be at x<0 at some point`).toBe(true);
        expect(seenPosX, `${id} should be at x>0 at some point`).toBe(true);
      }
    });
  });

  describe("backer moves outward, non-backer moves inward (fast-check)", () => {
    it("at a quarter beat, backer abs(x) > init abs(x) and non-backer abs(x) < init abs(x)", () => {
      fc.assert(
        fc.property(fcRole, fcHand, (backer, backerDir) => {
          const init = initFormationStates.improper;
          const instr = makeInstr({ backer, backerDir });
          const segments = poussetteSegments(instr, init, allProtos);
          const animation = animateSegments(init, allProtos, segments);
          const frame = animation.getFrame(0.25);
          for (const id of ALL_PROTO_IDS) {
            const initAbsX = Math.abs(init[id].pos.x);
            const frameAbsX = Math.abs(frame[id].pos.x);
            if (getRole(id) === backer) {
              if (frameAbsX <= initAbsX) {
                return false;
              }
            } else {
              if (frameAbsX >= initAbsX) {
                return false;
              }
            }
          }
          return true;
        }),
      );
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
