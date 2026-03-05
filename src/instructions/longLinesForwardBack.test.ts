import { produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import { EAST, NORTH, WEST } from "../geometry";
import { advanceState, getSegmentFrameAtFrac } from "./_segment";
import { initFormationStates } from "./index";
import {
  assignNonOverlappingSlots,
  type LongLinesForwardBackInstruction,
  longLinesForwardBackSegments,
} from "./longLinesForwardBack";

const allProtos = ALL_PROTO_IDS_SET;

const instr: LongLinesForwardBackInstruction = {
  id: "00000000-0000-0000-0000-000000000001",
  beats: 8,
  type: "long_lines_forward_back",
};

// Improper formation with everyone facing across:
// Left line:  up_lark(-0.5,-0.5) EAST, down_robin(-0.5,0.5) EAST
// Right line: up_robin(0.5,-0.5) WEST, down_lark(0.5,0.5) WEST
const facingAcrossInit = produce(initFormationStates.improper, (draft) => {
  draft.up_lark_0.facing = EAST;
  draft.up_robin_0.facing = WEST;
  draft.down_lark_0.facing = WEST;
  draft.down_robin_0.facing = EAST;
});

describe("longLinesForwardBack", () => {
  it("walks forward to x=±0.2 with y snapped to nearest half-integer", () => {
    const segments = longLinesForwardBackSegments(
      instr,
      facingAcrossInit,
      allProtos,
    );
    const midState = getSegmentFrameAtFrac(
      segments[0],
      facingAcrossInit,
      allProtos,
      1,
    );

    expect(midState.up_lark_0.pos.x).toBeCloseTo(-0.2);
    expect(midState.up_lark_0.pos.y).toBeCloseTo(-0.5);
    expect(midState.up_robin_0.pos.x).toBeCloseTo(0.2);
    expect(midState.up_robin_0.pos.y).toBeCloseTo(-0.5);
    expect(midState.down_lark_0.pos.x).toBeCloseTo(0.2);
    expect(midState.down_lark_0.pos.y).toBeCloseTo(0.5);
    expect(midState.down_robin_0.pos.x).toBeCloseTo(-0.2);
    expect(midState.down_robin_0.pos.y).toBeCloseTo(0.5);
  });

  it("faces exactly across at midpoint", () => {
    const segments = longLinesForwardBackSegments(
      instr,
      facingAcrossInit,
      allProtos,
    );
    const midState = getSegmentFrameAtFrac(
      segments[0],
      facingAcrossInit,
      allProtos,
      1,
    );

    expect(midState.up_lark_0.facing.x).toBeCloseTo(EAST.x);
    expect(midState.up_lark_0.facing.y).toBeCloseTo(EAST.y);
    expect(midState.up_robin_0.facing.x).toBeCloseTo(WEST.x);
    expect(midState.up_robin_0.facing.y).toBeCloseTo(WEST.y);
  });

  it("takes inside hands in the first half", () => {
    const segments = longLinesForwardBackSegments(
      instr,
      facingAcrossInit,
      allProtos,
    );
    const midState = getSegmentFrameAtFrac(
      segments[0],
      facingAcrossInit,
      allProtos,
      1,
    );

    // up_lark at (-0.5,-0.5) facing EAST:
    //   on_left (NORTH) → down_robin_0 at (-0.5, 0.5)
    //   on_right (SOUTH) → down_robin_-1 at (-0.5, -1.5)
    expect(midState.up_lark_0.hands.left).toEqual({
      theirId: "down_robin_0",
      theirHand: "right",
    });
    expect(midState.up_lark_0.hands.right).toEqual({
      theirId: "down_robin_-1",
      theirHand: "left",
    });

    // down_robin at (-0.5,0.5) facing EAST:
    //   on_left (NORTH) → up_lark_1 at (-0.5, 1.5)
    //   on_right (SOUTH) → up_lark_0 at (-0.5, -0.5)
    expect(midState.down_robin_0.hands.left).toEqual({
      theirId: "up_lark_1",
      theirHand: "right",
    });
    expect(midState.down_robin_0.hands.right).toEqual({
      theirId: "up_lark_0",
      theirHand: "left",
    });
  });

  it("steps back out to x=±0.5 in the second half", () => {
    const segments = longLinesForwardBackSegments(
      instr,
      facingAcrossInit,
      allProtos,
    );
    const finalState = advanceState(segments, facingAcrossInit, allProtos);

    expect(finalState.up_lark_0.pos.x).toBeCloseTo(-0.5);
    expect(finalState.up_lark_0.pos.y).toBeCloseTo(-0.5);
    expect(finalState.up_robin_0.pos.x).toBeCloseTo(0.5);
    expect(finalState.up_robin_0.pos.y).toBeCloseTo(-0.5);
    expect(finalState.down_lark_0.pos.x).toBeCloseTo(0.5);
    expect(finalState.down_lark_0.pos.y).toBeCloseTo(0.5);
    expect(finalState.down_robin_0.pos.x).toBeCloseTo(-0.5);
    expect(finalState.down_robin_0.pos.y).toBeCloseTo(0.5);
  });

  it("keeps hands held in the second half", () => {
    const segments = longLinesForwardBackSegments(
      instr,
      facingAcrossInit,
      allProtos,
    );
    const finalState = advanceState(segments, facingAcrossInit, allProtos);

    // Same hand connections as during the first half
    expect(finalState.up_lark_0.hands.left).toEqual({
      theirId: "down_robin_0",
      theirHand: "right",
    });
    expect(finalState.up_lark_0.hands.right).toEqual({
      theirId: "down_robin_-1",
      theirHand: "left",
    });
  });

  it("maintains facing across in the second half", () => {
    const segments = longLinesForwardBackSegments(
      instr,
      facingAcrossInit,
      allProtos,
    );
    const finalState = advanceState(segments, facingAcrossInit, allProtos);

    expect(finalState.up_lark_0.facing.x).toBeCloseTo(EAST.x);
    expect(finalState.up_lark_0.facing.y).toBeCloseTo(EAST.y);
    expect(finalState.down_lark_0.facing.x).toBeCloseTo(WEST.x);
    expect(finalState.down_lark_0.facing.y).toBeCloseTo(WEST.y);
  });

  it("throws if a dancer does not face across", () => {
    const badInit = produce(facingAcrossInit, (draft) => {
      draft.up_lark_0.facing = NORTH;
    });

    expect(() =>
      longLinesForwardBackSegments(instr, badInit, allProtos),
    ).toThrow("must face across");
  });

  it("assigns non-overlapping y slots when dancers would collide", () => {
    // Move down_robin close to up_lark: both would naively snap to y=-0.5
    const overlapInit = produce(facingAcrossInit, (draft) => {
      draft.down_robin_0.pos = new Vector(-0.5, -0.3);
    });

    const segments = longLinesForwardBackSegments(
      instr,
      overlapInit,
      allProtos,
    );
    const midState = getSegmentFrameAtFrac(
      segments[0],
      overlapInit,
      allProtos,
      1,
    );

    // Optimal: up_lark(y=-0.5) → -0.5 (cost 0), down_robin(y=-0.3) → 0.5 (cost 0.8)
    // Total cost 0.8 — better than (-1.5,-0.5) which costs 1.2
    expect(midState.up_lark_0.pos.x).toBeCloseTo(-0.2);
    expect(midState.up_lark_0.pos.y).toBeCloseTo(-0.5);
    expect(midState.down_robin_0.pos.x).toBeCloseTo(-0.2);
    expect(midState.down_robin_0.pos.y).toBeCloseTo(0.5);

    // Right side dancers are unaffected
    expect(midState.up_robin_0.pos.y).toBeCloseTo(-0.5);
    expect(midState.down_lark_0.pos.y).toBeCloseTo(0.5);
  });

  it("throws if a dancer has no opposite-role dancer on a side", () => {
    // Put both larks on the left, both robins on the right
    const badInit = produce(facingAcrossInit, (draft) => {
      draft.down_lark_0.pos = new Vector(-0.5, 0.5);
      draft.down_lark_0.facing = EAST;
      draft.down_robin_0.pos = new Vector(0.5, 0.5);
      draft.down_robin_0.facing = WEST;
    });

    expect(() =>
      longLinesForwardBackSegments(instr, badInit, allProtos),
    ).toThrow("no opposite-role dancer");
  });
});

describe("assignNonOverlappingSlots", () => {
  it("returns nearest half-integers when no conflict", () => {
    const result = assignNonOverlappingSlots([
      { id: "up_lark_0", y: -0.5 },
      { id: "down_robin_0", y: 0.5 },
    ]);
    expect(result.get("up_lark_0")).toBe(-0.5);
    expect(result.get("down_robin_0")).toBe(0.5);
  });

  it("separates dancers that would collide, minimizing total displacement", () => {
    const result = assignNonOverlappingSlots([
      { id: "up_lark_0", y: -0.5 },
      { id: "down_robin_0", y: -0.3 },
    ]);
    // (-0.5, 0.5) costs 0 + 0.8 = 0.8 — optimal
    expect(result.get("up_lark_0")).toBe(-0.5);
    expect(result.get("down_robin_0")).toBe(0.5);
  });

  it("handles single dancer", () => {
    const result = assignNonOverlappingSlots([{ id: "up_lark_0", y: 0.3 }]);
    expect(result.get("up_lark_0")).toBe(0.5);
  });

  it("handles empty input", () => {
    const result = assignNonOverlappingSlots([]);
    expect(result.size).toBe(0);
  });

  it("handles three dancers at the same y", () => {
    const result = assignNonOverlappingSlots([
      { id: "up_lark_0", y: 0.5 },
      { id: "down_robin_0", y: 0.5 },
      { id: "up_robin_0", y: 0.5 },
    ]);
    const slots = [...result.values()].sort((a, b) => a - b);
    // Must be 3 distinct half-integers
    expect(slots).toHaveLength(3);
    expect(slots[0]).not.toBe(slots[1]);
    expect(slots[1]).not.toBe(slots[2]);
    // Optimal: (-0.5, 0.5, 1.5) costs 1+0+1=2
    expect(slots).toEqual([-0.5, 0.5, 1.5]);
  });
});
