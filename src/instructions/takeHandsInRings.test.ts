import { produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET, type DancerId } from "../contraCore";
import { getDir } from "../geometry";
import { labelId } from "../identifiers";
import { must } from "../utils";
import { Dancer } from "../worldState";
import { getSegmentFrameAtFrac } from "./_segment";
import { initFormationStates } from "./index";
import {
  type TakeHandsInRingsInstruction,
  takeHandsInRingsSegments,
} from "./takeHandsInRings";

const allProtos = ALL_PROTO_IDS_SET;

function makeInstr(
  overrides: Partial<TakeHandsInRingsInstruction> = {},
): TakeHandsInRingsInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 0,
    type: "take_hands_in_rings",
    ...overrides,
  };
}

const DUMMY_INSTR = makeInstr();

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
      current = must(Dancer.get(current, final).hands.right).theirId;
      visited.push(current);
    }
    const back = must(Dancer.get(current, final).hands.right).theirId;
    expect(back).toBe("up_lark_0");
    expect(new Set(visited).size).toBe(4);
  });

  it("disambiguatingCid resolves ambiguity in becket", () => {
    // In becket with empty recents, getGroupOfFour is ambiguous
    // (preferCloser ties, preferOneInFront ties, preferRecent has no data).
    // The disambiguatingCid hint should resolve this.
    const becketNoRecents = produce(initFormationStates.becket, (draft) => {
      for (const id of ALL_PROTO_IDS) draft[id].recents = [];
    });

    // Without hint, should throw due to ambiguity
    expect(() =>
      takeHandsInRingsSegments(makeInstr(), becketNoRecents, allProtos),
    ).toThrow();

    // With hint "partner", should succeed
    const instr = makeInstr({ disambiguatingCid: labelId("partner") });
    const segments = takeHandsInRingsSegments(
      instr,
      becketNoRecents,
      allProtos,
    );
    const final = getSegmentFrameAtFrac(
      segments[0],
      becketNoRecents,
      allProtos,
      1,
    );

    // Every dancer has both hands connected
    for (const id of ALL_PROTO_IDS) {
      expect(final[id].hands.left, `${id} missing left hand`).toBeDefined();
      expect(final[id].hands.right, `${id} missing right hand`).toBeDefined();
    }

    // Partner should be in the ring: follow right hands from up_lark_0
    // and expect to find up_robin_0 (partner)
    let current: DancerId = "up_lark_0";
    const visited: DancerId[] = [current];
    for (let i = 0; i < 3; i++) {
      current = must(Dancer.get(current, final).hands.right).theirId;
      visited.push(current);
    }
    expect(visited).toContain("up_robin_0");
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
