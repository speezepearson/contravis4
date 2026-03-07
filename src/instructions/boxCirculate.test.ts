import { produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../contraCore";
import { EAST, WEST } from "../geometry";
import { Dancer, type WorldState } from "../worldState";
import { getSegmentFrameAtFrac } from "./_segment";
import {
  type BoxCirculateInstruction,
  boxCirculateSegments,
} from "./boxCirculate";
import {
  type FormLongWavesInstruction,
  formLongWavesSegments,
} from "./formLongWaves";
import { initFormationStates } from "./index";

const allProtos = ALL_PROTO_IDS_SET;

const formInstr: FormLongWavesInstruction = {
  id: "00000000-0000-0000-0000-000000000001",
  beats: 0,
  type: "form_long_waves",
};

const circInstr: BoxCirculateInstruction = {
  id: "00000000-0000-0000-0000-000000000002",
  beats: 4,
  type: "box_circulate",
};

/**
 * Long-waves formation: larks across, robins out.
 *   up_lark_0(-0.5,-0.5) EAST, down_robin_0(-0.5,0.5) WEST
 *   down_lark_0(0.5,0.5) WEST, up_robin_0(0.5,-0.5) EAST
 */
const longWavesInit: WorldState = produce(
  initFormationStates.improper,
  (draft) => {
    draft.up_lark_0.facing = EAST;
    draft.down_lark_0.facing = WEST;
    draft.down_robin_0.facing = WEST;
    draft.up_robin_0.facing = EAST;
  },
);

/** Apply formLongWaves to get hands connected. */
function makeLongWavesState(): WorldState {
  const segments = formLongWavesSegments(formInstr, longWavesInit, allProtos);
  return getSegmentFrameAtFrac(segments[0], longWavesInit, allProtos, 1);
}

describe("boxCirculate", () => {
  it("moves across-facing dancers in_front, out-facing dancers to right-hand partner", () => {
    const wavesState = makeLongWavesState();
    const segments = boxCirculateSegments(circInstr, wavesState, allProtos);
    const result = getSegmentFrameAtFrac(segments[0], wavesState, allProtos, 1);

    // up_lark_0 (across, EAST): moves to up_robin_0's position, facing stays EAST
    expect(result.up_lark_0.pos.x).toBeCloseTo(0.5, 10);
    expect(result.up_lark_0.pos.y).toBeCloseTo(-0.5, 10);
    expect(result.up_lark_0.facing.x).toBeCloseTo(EAST.x, 10);
    expect(result.up_lark_0.facing.y).toBeCloseTo(EAST.y, 10);

    // down_lark_0 (across, WEST): moves to down_robin_0's position, facing stays WEST
    expect(result.down_lark_0.pos.x).toBeCloseTo(-0.5, 10);
    expect(result.down_lark_0.pos.y).toBeCloseTo(0.5, 10);
    expect(result.down_lark_0.facing.x).toBeCloseTo(WEST.x, 10);
    expect(result.down_lark_0.facing.y).toBeCloseTo(WEST.y, 10);

    // down_robin_0 (out, WEST): moves to right-hand dancer's position, facing rotates 180° CW → EAST
    // down_robin_0's right hand connects to up_lark_1 (offset +1), at (-0.5, 1.5)
    expect(result.down_robin_0.pos.x).toBeCloseTo(-0.5, 10);
    expect(result.down_robin_0.pos.y).toBeCloseTo(1.5, 10);
    expect(result.down_robin_0.facing.x).toBeCloseTo(EAST.x, 10);
    expect(result.down_robin_0.facing.y).toBeCloseTo(EAST.y, 10);

    // up_robin_0 (out, EAST): moves to right-hand dancer's position, facing rotates 180° CW → WEST
    // up_robin_0's right hand connects to down_lark_-1 (offset -1), at (0.5, -1.5)
    expect(result.up_robin_0.pos.x).toBeCloseTo(0.5, 10);
    expect(result.up_robin_0.pos.y).toBeCloseTo(-1.5, 10);
    expect(result.up_robin_0.facing.x).toBeCloseTo(WEST.x, 10);
    expect(result.up_robin_0.facing.y).toBeCloseTo(WEST.y, 10);

    // All hands should be empty after boxCirculate
    for (const id of ALL_PROTO_IDS) {
      expect(result[id].hands).toEqual({});
    }
  });

  it("out-facing dancers travel in a clockwise semicircle", () => {
    const wavesState = makeLongWavesState();
    const segments = boxCirculateSegments(circInstr, wavesState, allProtos);
    const seg = segments[0];

    // At frac=0.5, out-facing dancers should be at the 90° CW point of the semicircle
    // down_robin_0: (-0.5,0.5)→(-0.5,1.5), center=(-0.5,1.0), at frac=0.5 → (-1.0, 1.0)
    const drPos = seg.position!(Dancer.get("down_robin_0", wavesState), 0.5);
    expect(drPos.x).toBeCloseTo(-1.0, 10);
    expect(drPos.y).toBeCloseTo(1.0, 10);

    // up_robin_0: (0.5,-0.5)→(0.5,-1.5), center=(0.5,-1.0), at frac=0.5 → (1.0, -1.0)
    const urPos = seg.position!(Dancer.get("up_robin_0", wavesState), 0.5);
    expect(urPos.x).toBeCloseTo(1.0, 10);
    expect(urPos.y).toBeCloseTo(-1.0, 10);

    // Across-facing dancers should still be at the linear midpoint
    const ulPos = seg.position!(Dancer.get("up_lark_0", wavesState), 0.5);
    expect(ulPos.x).toBeCloseTo(0.0, 10);
    expect(ulPos.y).toBeCloseTo(-0.5, 10);
  });

  it("throws if a dancer faces neither out nor across", () => {
    const badInit = produce(longWavesInit, (draft) => {
      draft.up_lark_0.facing = new Vector(0, 1); // NORTH — neither out nor across
    });

    expect(() => boxCirculateSegments(circInstr, badInit, allProtos)).toThrow(
      "not facing out or across",
    );
  });
});
