import { enableMapSet, produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

enableMapSet();

import { ALL_PROTO_IDS } from "../contraCore";
import { ccwRadsBetween, NORTH, PI } from "../geometry";
import { animateSegments } from "./_segment";
import { initFormationStates } from "./index";
import { type RollAwayInstruction, rollAwaySegments } from "./rollAway";

const allProtos = ALL_PROTO_IDS_SET;

function makeInstr(
  overrides: Partial<RollAwayInstruction> = {},
): RollAwayInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 2,
    type: "roll_away",
    roller: "lark",
    rollee: "on_right",
    ...overrides,
  };
}

describe("rollAway", () => {
  describe("validation", () => {
    it("throws if a roller can't find an appropriate rollee", () => {
      const init = produce(initFormationStates.improper, (draft) => {
        draft.up_robin_0.pos = new Vector(-1.5, -0.5);
      });
      const instr = makeInstr({ roller: "lark", rollee: "on_right" });
      expect(() => rollAwaySegments(instr, init, allProtos)).toThrow(
        "has no opposite-role",
      );
    });

    it("throws if two rollers have the same rollee", () => {
      const init = produce(initFormationStates.improper, (draft) => {
        draft.up_lark_0.pos = new Vector(0, 0);
        draft.down_lark_0.pos = new Vector(0, 0.2);
        draft.up_robin_0.pos = new Vector(1, 0);
        draft.down_robin_0.pos = new Vector(1.1, 0);
        for (const id of allProtos) {
          draft[id].facing = NORTH;
        }
      });
      const instr = makeInstr({ roller: "lark", rollee: "on_right" });
      expect(() => rollAwaySegments(instr, init, allProtos)).toThrow(
        "both grabbed the same rollee",
      );
    });
  });

  describe("RTL with roller=lark", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ roller: "lark", rollee: "on_right" });
    const animation = animateSegments(
      init,
      allProtos,
      rollAwaySegments(instr, init, allProtos),
    );
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

    it("all dancers face the same way, within 45deg of original", () => {
      const MAX_DEVIATION = PI / 4;

      // Up pair should face the same direction
      const upAngleDiff = Math.abs(
        ccwRadsBetween(final.up_lark_0.facing, final.up_robin_0.facing),
      );
      expect(upAngleDiff).toBeLessThan(0.01);

      // Down pair should face the same direction
      const downAngleDiff = Math.abs(
        ccwRadsBetween(final.down_lark_0.facing, final.down_robin_0.facing),
      );
      expect(downAngleDiff).toBeLessThan(0.01);

      // Each dancer's final facing is within 45° of their original
      for (const id of ALL_PROTO_IDS) {
        const deviation = Math.abs(
          ccwRadsBetween(init[id].facing, final[id].facing),
        );
        expect(deviation, `${id} facing deviated too far`).toBeLessThan(
          MAX_DEVIATION,
        );
      }
    });
  });
});
