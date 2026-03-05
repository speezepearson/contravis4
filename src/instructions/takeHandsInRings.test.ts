import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET, type DancerId } from "../contraCore";
import { getDir } from "../geometry";
import { must } from "../utils";
import { Dancer } from "../worldState";
import { getSegmentFrameAtFrac } from "./_segment";
import { initFormationStates } from "./index";
import { takeHandsInRingsSegments } from "./takeHandsInRings";

const allProtos = ALL_PROTO_IDS_SET;

const DUMMY_INSTR = {
  id: "00000000-0000-0000-0000-000000000000" as const,
  beats: 0 as const,
  type: "take_hands_in_rings" as const,
};

describe("takeHandsInRings", () => {
  it("forms a ring of 4 in improper formation", () => {
    const init = initFormationStates.improper;
    const segments = takeHandsInRingsSegments(DUMMY_INSTR, init, allProtos);
    expect(segments).toHaveLength(1);
    expect(segments[0].dur).toBe(0);

    const final = getSegmentFrameAtFrac(segments[0], init, allProtos, 1);

    // Every dancer has both hands connected
    for (const id of ALL_PROTO_IDS) {
      expect(final[id].hands.left, `${id} missing left hand`).toBeDefined();
      expect(final[id].hands.right, `${id} missing right hand`).toBeDefined();
    }

    // Following right hands forms a ring of exactly 4
    let current: DancerId = "up_lark_0";
    const visited: DancerId[] = [current];
    for (let i = 0; i < 3; i++) {
      const { theirId } = must(Dancer.get(current, final).hands.right);
      current = theirId;
      visited.push(current);
    }
    const { theirId: back } = must(Dancer.get(current, final).hands.right);
    expect(back).toBe("up_lark_0");
    expect(new Set(visited).size).toBe(4);
  });

  it("turns dancers to face the center of the ring", () => {
    const init = initFormationStates.improper;
    const segments = takeHandsInRingsSegments(DUMMY_INSTR, init, allProtos);
    const final = getSegmentFrameAtFrac(segments[0], init, allProtos, 1);

    // In the symmetric improper formation, ring center is at (0, 0)
    const center = new Vector(0, 0);
    for (const id of ALL_PROTO_IDS) {
      const dirToCenter = getDir({ from: final[id].pos, to: center });
      const dot = final[id].facing.dot(dirToCenter);
      expect(dot, `${id} should face toward center`).toBeGreaterThan(0.99);
    }
  });
});
