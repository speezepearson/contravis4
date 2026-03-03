import { enableMapSet, produce } from "immer";
import { describe, expect, it } from "vitest";
import { Vector } from "vecti";

enableMapSet();

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { NORTH, SOUTH } from "../geometry";
import { initFormationStates } from "./index";
import { toAnimator } from "./_segment";
import { rollAwaySegments, type RollAwayInstruction } from "./rollAway";

const allProtos = new Set<ProtoId>(ALL_PROTO_IDS);

function makeInstr(
  overrides: Partial<RollAwayInstruction> = {},
): RollAwayInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 2,
    type: "roll_away",
    roller: "lark",
    dir: "rtl",
    ...overrides,
  };
}

describe("rollAway", () => {
  describe("validation", () => {
    it("throws if a roller can't find an appropriate rollee", () => {
      const init = produce(initFormationStates.improper, (draft) => {
        draft.up_robin_0.pos = new Vector(-1.5, -0.5);
      });
      const instr = makeInstr({ roller: "lark", dir: "rtl" });
      const animator = toAnimator(rollAwaySegments(instr));
      expect(() => animator(init, allProtos)).toThrow('has no opposite-role dancer');
    });

    it("throws if two rollers have the same rollee", () => {
      const init = produce(initFormationStates.improper, (draft) => {
        draft.up_lark_0.pos = new Vector(0, 0);
        draft.down_lark_0.pos = new Vector(0, .2);
        draft.up_robin_0.pos = new Vector(1, 0);
        draft.down_robin_0.pos = new Vector(1.1, 0);
        for (const id of allProtos) {
          draft[id].facing = NORTH;
        }
      });
      const instr = makeInstr({ roller: "lark", dir: "rtl" });
      expect(() =>
        rollAwaySegments(instr)(init, allProtos)
      ).toThrow('both resolved to the same rollee');
    });
  });

  describe("RTL with roller=lark", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ roller: "lark", dir: "rtl" });
    const animation = toAnimator(rollAwaySegments(instr))(init, allProtos);
    const final = animation.getFrame(animation.dur);

    it("swaps places at the end", () => {
      // up_lark ↔ up_robin
      expect(final.up_lark_0.pos.x).toBeCloseTo(init.up_robin_0.pos.x);
      expect(final.up_lark_0.pos.y).toBeCloseTo(init.up_robin_0.pos.y);
      expect(final.up_robin_0.pos.x).toBeCloseTo(init.up_lark_0.pos.x);
      expect(final.up_robin_0.pos.y).toBeCloseTo(init.up_lark_0.pos.y);

      // down_lark ↔ down_robin
      expect(final.down_lark_0.pos.x).toBeCloseTo(init.down_robin_0.pos.x);
      expect(final.down_lark_0.pos.y).toBeCloseTo(init.down_robin_0.pos.y);
      expect(final.down_robin_0.pos.x).toBeCloseTo(init.down_lark_0.pos.x);
      expect(final.down_robin_0.pos.y).toBeCloseTo(init.down_lark_0.pos.y);
    });

    it("preserves facing for both roller and rollee", () => {
      // Roller (lark) facing unchanged
      expect(final.up_lark_0.facing.x).toBeCloseTo(init.up_lark_0.facing.x);
      expect(final.up_lark_0.facing.y).toBeCloseTo(init.up_lark_0.facing.y);
      expect(final.down_lark_0.facing.x).toBeCloseTo(init.down_lark_0.facing.x);
      expect(final.down_lark_0.facing.y).toBeCloseTo(init.down_lark_0.facing.y);

      // Rollee (robin) facing unchanged (360° rotation = back to start)
      expect(final.up_robin_0.facing.x).toBeCloseTo(init.up_robin_0.facing.x);
      expect(final.up_robin_0.facing.y).toBeCloseTo(init.up_robin_0.facing.y);
      expect(final.down_robin_0.facing.x).toBeCloseTo(init.down_robin_0.facing.x);
      expect(final.down_robin_0.facing.y).toBeCloseTo(init.down_robin_0.facing.y);
    });
  });
});
