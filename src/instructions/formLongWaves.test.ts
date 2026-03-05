import { produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../contraCore";
import { EAST, WEST } from "../geometry";
import { type WorldState } from "../worldState";
import { getSegmentFrameAtFrac } from "./_segment";
import {
  type FormLongWavesInstruction,
  formLongWavesSegments,
} from "./formLongWaves";
import { initFormationStates } from "./index";

const allProtos = ALL_PROTO_IDS_SET;

const instr: FormLongWavesInstruction = {
  id: "00000000-0000-0000-0000-000000000001",
  beats: 0,
  type: "form_long_waves",
};

/**
 * A long-waves-compatible formation: two columns with alternating facings.
 * Larks face across (toward center), robins face out (away from center).
 *   left column:  up_lark(-0.5,-0.5) facing EAST(across), down_robin(-0.5,0.5) facing WEST(out)
 *   right column: down_lark(0.5,0.5) facing WEST(across), up_robin(0.5,-0.5) facing EAST(out)
 */
const longWavesInit: WorldState = produce(
  initFormationStates.improper,
  (draft) => {
    // larks across: x<0 → EAST, x>0 → WEST
    draft.up_lark_0.facing = EAST;
    draft.down_lark_0.facing = WEST;
    // robins out: x<0 → WEST, x>0 → EAST
    draft.down_robin_0.facing = WEST;
    draft.up_robin_0.facing = EAST;
  },
);

describe("formLongWaves", () => {
  it("snaps facings and connects hands", () => {
    const segments = formLongWavesSegments(instr, longWavesInit, allProtos);
    const result = getSegmentFrameAtFrac(
      segments[0],
      longWavesInit,
      allProtos,
      1,
    );

    // Facings should be preserved (already exact EAST/WEST)
    expect(result.up_lark_0.facing.x).toBeCloseTo(EAST.x, 10);
    expect(result.down_lark_0.facing.x).toBeCloseTo(WEST.x, 10);
    expect(result.down_robin_0.facing.x).toBeCloseTo(WEST.x, 10);
    expect(result.up_robin_0.facing.x).toBeCloseTo(EAST.x, 10);

    // Each dancer should have both hands connected
    for (const id of ALL_PROTO_IDS) {
      expect(
        result[id].hands.left,
        `${id} should have left hand`,
      ).toBeDefined();
      expect(
        result[id].hands.right,
        `${id} should have right hand`,
      ).toBeDefined();
    }

    // Left column: up_lark(EAST) on_left=NORTH -> down_robin_0; on_right=SOUTH -> down_robin_-1
    expect(result.up_lark_0.hands.left?.theirId).toBe("down_robin_0");
    expect(result.up_lark_0.hands.left?.theirHand).toBe("left");
    expect(result.up_lark_0.hands.right?.theirId).toBe("down_robin_-1");
    expect(result.up_lark_0.hands.right?.theirHand).toBe("right");

    // Right column: up_robin(EAST) on_left=NORTH -> down_lark_0; on_right=SOUTH -> down_lark_-1
    expect(result.up_robin_0.hands.left?.theirId).toBe("down_lark_0");
    expect(result.up_robin_0.hands.left?.theirHand).toBe("left");
    expect(result.up_robin_0.hands.right?.theirId).toBe("down_lark_-1");
    expect(result.up_robin_0.hands.right?.theirHand).toBe("right");
  });

  it("snaps facing to nearest of across/out", () => {
    // Slightly off-axis facings should snap to nearest EAST/WEST
    const init = produce(longWavesInit, (draft) => {
      // up_lark at x<0, slightly NE -> snap to EAST (across) ✓
      draft.up_lark_0.facing = new Vector(0.9, 0.4);
      // down_robin at x<0, slightly SW -> snap to WEST (out) ✓
      draft.down_robin_0.facing = new Vector(-0.8, -0.3);
    });

    const segments = formLongWavesSegments(instr, init, allProtos);
    const result = getSegmentFrameAtFrac(segments[0], init, allProtos, 1);

    expect(result.up_lark_0.facing.x).toBeCloseTo(EAST.x, 10);
    expect(result.up_lark_0.facing.y).toBeCloseTo(EAST.y, 10);
    expect(result.down_robin_0.facing.x).toBeCloseTo(WEST.x, 10);
    expect(result.down_robin_0.facing.y).toBeCloseTo(WEST.y, 10);
  });

  it("throws if both larks are on the same side", () => {
    const badInit = produce(longWavesInit, (draft) => {
      draft.down_lark_0.pos = new Vector(-0.5, 0.5);
    });

    expect(() => formLongWavesSegments(instr, badInit, allProtos)).toThrow(
      "formLongWaves requires one lark on each side of the set",
    );
  });

  it("throws if both robins are on the same side", () => {
    const badInit = produce(longWavesInit, (draft) => {
      draft.down_robin_0.pos = new Vector(0.5, 0.5);
    });

    expect(() => formLongWavesSegments(instr, badInit, allProtos)).toThrow(
      "formLongWaves requires one robin on each side of the set",
    );
  });

  it("throws if larks don't all face the same way (across vs out)", () => {
    // up_lark at x<0 faces EAST (across), down_lark at x>0 faces EAST (out)
    // → one across, one out → should throw
    const badInit = produce(longWavesInit, (draft) => {
      draft.down_lark_0.facing = EAST; // was WEST (across), now EAST (out)
    });

    expect(() => formLongWavesSegments(instr, badInit, allProtos)).toThrow(
      "formLongWaves requires all larks facing the same way",
    );
  });
});
