import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET, getRole } from "../contraCore";
import { fcHand } from "../testHelpers";
import { advanceState, animateSegments } from "./_segment";
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
    dir: "left",
    nZigs: 2,
    ...overrides,
  };
}

describe("zigZag", () => {
  describe("nZigs=2 (dir=left)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr();
    const segments = zigZagSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);
    const final = animation.getFrame(animation.dur);

    it("moves dancers 2 units along the line after 2 zigs", () => {
      for (const id of ALL_PROTO_IDS) {
        expect(final[id].pos.x, `${id} x`).toBeCloseTo(init[id].pos.x);
        expect(
          Math.abs(final[id].pos.y - init[id].pos.y),
          `${id} y`,
        ).toBeCloseTo(2);
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
      // dir=left, improper: leader=lark (west side), inside hands = west's right + east's left
      // up_lark (west): right hand holds up_robin's left
      expect(frame.up_lark_0.hands.right?.theirId).toBe("up_robin_0");
      expect(frame.up_lark_0.hands.right?.theirHand).toBe("left");
      expect(frame.up_lark_0.hands.left).toBeUndefined();
      // up_robin (east): left hand holds up_lark's right
      expect(frame.up_robin_0.hands.left?.theirId).toBe("up_lark_0");
      expect(frame.up_robin_0.hands.left?.theirHand).toBe("right");
      expect(frame.up_robin_0.hands.right).toBeUndefined();
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
      // up_lark should have moved in y
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
      expect(final.up_lark_0.pos.y).toBeCloseTo(init.up_lark_0.pos.y + 1);
      expect(final.up_lark_0.pos.x).toBeCloseTo(init.up_lark_0.pos.x);
    });
  });

  describe("nZigs=2 crosses the center line", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr();
    const segments = zigZagSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);

    it("every dancer is at x<0 and x>0 at some point", () => {
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

  describe("dir=left and dir=right progress in the same direction", () => {
    const init = initFormationStates.improper;
    const instrL = makeInstr({ dir: "left", nZigs: 1 });
    const instrR = makeInstr({ dir: "right", nZigs: 1 });
    const segsL = zigZagSegments(instrL, init, allProtos);
    const segsR = zigZagSegments(instrR, init, allProtos);
    const finalL = advanceState(segsL, init, allProtos);
    const finalR = advanceState(segsR, init, allProtos);

    it("both dir values move each dancer to the same final y", () => {
      for (const id of ALL_PROTO_IDS) {
        expect(finalL[id].pos.y, `${id} y`).toBeCloseTo(finalR[id].pos.y);
      }
    });
  });

  describe.each([
    { nZigs: 1 as const, beats: 8 },
    { nZigs: 2 as const, beats: 8 },
    { nZigs: 3 as const, beats: 12 },
  ])("nZigs=$nZigs y-displacement", ({ nZigs, beats }) => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ nZigs, beats });
    const segments = zigZagSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);
    const final = animation.getFrame(animation.dur);

    it(`every dancer has abs(final.y - init.y) = ${nZigs}`, () => {
      for (const id of ALL_PROTO_IDS) {
        expect(
          Math.abs(final[id].pos.y - init[id].pos.y),
          `${id} y-displacement`,
        ).toBeCloseTo(nZigs);
      }
    });
  });

  describe("leader moves outward, follower moves inward (fast-check)", () => {
    it("at a quarter beat, leader abs(x) > init abs(x) and follower abs(x) < init abs(x)", () => {
      fc.assert(
        fc.property(fcHand, (dir) => {
          const init = initFormationStates.improper;
          const instr = makeInstr({ dir, nZigs: 1 });
          const segments = zigZagSegments(instr, init, allProtos);
          const animation = animateSegments(init, allProtos, segments);
          const frame = animation.getFrame(0.25);

          // Determine leader role: dir=left → lark, dir=right → robin (in improper)
          const leaderRole = dir === "left" ? "lark" : "robin";

          for (const id of ALL_PROTO_IDS) {
            const initAbsX = Math.abs(init[id].pos.x);
            const frameAbsX = Math.abs(frame[id].pos.x);
            if (getRole(id) === leaderRole) {
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

  describe("dir=right", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ dir: "right", nZigs: 1 });
    const segments = zigZagSegments(instr, init, allProtos);
    const animation = animateSegments(init, allProtos, segments);
    const final = animation.getFrame(animation.dur);

    it("progresses the same direction as dir=left (north for up-facing)", () => {
      // Both dir values progress north; dir only affects which side leads
      expect(final.up_lark_0.pos.y).toBeCloseTo(init.up_lark_0.pos.y + 1);
    });

    it("leader is robin (east side) when dir=right", () => {
      const frame = animation.getFrame(instr.beats / 4);
      // dir=right → leader on east = robin; leader moves outward
      const initAbsX = Math.abs(init.up_robin_0.pos.x);
      const frameAbsX = Math.abs(frame.up_robin_0.pos.x);
      expect(frameAbsX).toBeGreaterThan(initAbsX);
    });

    it("only inside hands are held", () => {
      const frame = animation.getFrame(0);
      // Inside hands are position-based: west dancer's right, east dancer's left
      // up_lark (west): right hand holds up_robin's left
      expect(frame.up_lark_0.hands.right?.theirId).toBe("up_robin_0");
      expect(frame.up_lark_0.hands.right?.theirHand).toBe("left");
      expect(frame.up_lark_0.hands.left).toBeUndefined();
    });
  });
});
