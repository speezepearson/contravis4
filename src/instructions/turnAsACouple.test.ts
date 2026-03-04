import { enableMapSet, produce } from "immer";
import { describe, expect, it } from "vitest";

enableMapSet();

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { NORTH, SOUTH } from "../geometry";
import { toAnimator } from "./_segment";
import {
  type CaliforniaTwirlInstruction,
  californiaTwirlSegments,
} from "./californiaTwirl";
import { initFormationStates } from "./index";
import {
  type TurnAsACoupleInstruction,
  turnAsACoupleSegments,
} from "./turnAsACouple";

const allProtos = new Set<ProtoId>(ALL_PROTO_IDS);

function makeTurnAsACouple(
  overrides: Partial<TurnAsACoupleInstruction> = {},
): TurnAsACoupleInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 4,
    type: "turn_as_a_couple",
    cid: "partner",
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
    const instr = makeTurnAsACouple({ cid: "partner" });
    expect(() => turnAsACoupleSegments(instr)(badInit, allProtos)).toThrow(
      "not facing the same direction",
    );
  });

  it("produces the same final state as californiaTwirl", () => {
    const taacInstr = makeTurnAsACouple();
    const ctInstr = makeCaliforniaTwirl();

    const taacAnimation = toAnimator(turnAsACoupleSegments(taacInstr))(
      init,
      allProtos,
    );
    const ctAnimation = toAnimator(californiaTwirlSegments(ctInstr))(
      init,
      allProtos,
    );

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

    const taacAnimation = toAnimator(turnAsACoupleSegments(taacInstr))(
      init,
      allProtos,
    );
    const ctAnimation = toAnimator(californiaTwirlSegments(ctInstr))(
      init,
      allProtos,
    );

    const taacMid = taacAnimation.getFrame(2);
    const ctMid = ctAnimation.getFrame(2);

    for (const id of ALL_PROTO_IDS) {
      expect(taacMid[id].pos.x).toBeCloseTo(ctMid[id].pos.x);
      expect(taacMid[id].pos.y).toBeCloseTo(ctMid[id].pos.y);
    }
  });
});
