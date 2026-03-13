import { produce } from "immer";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../contraCore";
import { NORTH, SOUTH } from "../geometry";
import {
  californiaTwirlAnimator,
  type CaliforniaTwirlInstruction,
} from "./californiaTwirl";
import { initFormationStates } from "./index";
import {
  turnAsACoupleAnimator,
  type TurnAsACoupleInstruction,
} from "./turnAsACouple";

const allProtos = ALL_PROTO_IDS_SET;

function makeTurnAsACouple(
  overrides: Partial<TurnAsACoupleInstruction> = {},
): TurnAsACoupleInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 4,
    type: "turn_as_a_couple",
    ...overrides,
  };
}

function makeCaliforniaTwirl(
  overrides: Partial<CaliforniaTwirlInstruction> = {},
): CaliforniaTwirlInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 4,
    type: "california_twirl",
    ...overrides,
  };
}

describe("turnAsACouple", () => {
  const init = initFormationStates.improper;

  it("throws if matched dancers are not facing the same way", () => {
    const badInit = produce(init, (draft) => {
      draft.up_lark_0.facing = NORTH;
      draft.up_robin_0.facing = SOUTH;
    });
    const instr = makeTurnAsACouple();
    // Direction-based matching (lark's right / robin's left) fails before
    // the facing validation can fire, since the robin's "left" no
    // longer points at the lark.
    expect(() => turnAsACoupleAnimator(instr, badInit, allProtos)).toThrow();
  });

  it("produces the same final state as californiaTwirl", () => {
    const taacInstr = makeTurnAsACouple();
    const ctInstr = makeCaliforniaTwirl();

    const taacAnimation = turnAsACoupleAnimator(taacInstr, init, allProtos);
    const ctAnimation = californiaTwirlAnimator(ctInstr, init, allProtos);

    const taacFinal = taacAnimation.getFrame(taacAnimation.dur);
    const ctFinal = ctAnimation.getFrame(ctAnimation.dur);

    for (const id of ALL_PROTO_IDS) {
      expect(taacFinal[id].pos.x).toBeCloseTo(ctFinal[id].pos.x);
      expect(taacFinal[id].pos.y).toBeCloseTo(ctFinal[id].pos.y);
      expect(taacFinal[id].facing.x).toBeCloseTo(ctFinal[id].facing.x);
      expect(taacFinal[id].facing.y).toBeCloseTo(ctFinal[id].facing.y);
    }
  });

  it("produces the same midpoint state as californiaTwirl", () => {
    const taacInstr = makeTurnAsACouple();
    const ctInstr = makeCaliforniaTwirl();

    const taacAnimation = turnAsACoupleAnimator(taacInstr, init, allProtos);
    const ctAnimation = californiaTwirlAnimator(ctInstr, init, allProtos);

    const taacMid = taacAnimation.getFrame(2);
    const ctMid = ctAnimation.getFrame(2);

    for (const id of ALL_PROTO_IDS) {
      expect(taacMid[id].pos.x).toBeCloseTo(ctMid[id].pos.x);
      expect(taacMid[id].pos.y).toBeCloseTo(ctMid[id].pos.y);
    }
  });
});
