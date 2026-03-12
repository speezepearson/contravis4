import { produce } from "immer";
import { z } from "zod";

import { ALL_PROTO_IDS, parseProtoId, type ProtoId } from "../contraCore";
import { EAST, WEST } from "../geometry";
import { must, safeThreshold } from "../utils";
import {
  connectHands,
  Dancer,
  getDancerSide,
  type WorldState,
} from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  personInDir,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator, makeImmediateSegment } from "./_segment";

export const FormLongWavesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("form_long_waves"),
  beats: z.literal(0),
});
export type FormLongWavesInstruction = z.infer<
  typeof FormLongWavesInstructionSchema
>;

function validateAndComputeFinalState(
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): WorldState {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`formLongWaves instruction must target all dancers`);

  // Assert one lark on each side, one robin on each side
  for (const role of ["lark", "robin"] as const) {
    const protos = ALL_PROTO_IDS.filter((id) => parseProtoId(id).role === role);
    const sides = new Set(
      protos.map((id) => getDancerSide(Dancer.get(id, init))),
    );
    if (sides.size !== 2)
      throw new Error(
        `formLongWaves requires one ${role} on each side of the set, got sides [${sides}]`,
      );
  }

  // Snap facings to across or out (whichever is closer = EAST or WEST)
  const snappedState = produce(init, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      draft[id].facing = must(
        safeThreshold(draft[id].facing.x, { neg: WEST, pos: EAST }),
        [{ dancerId: id }, " isn't sure whether to face in or out"],
      );
    }
  });

  // Assert that either larks face out & robins across, or vice versa.
  const larkIds = ALL_PROTO_IDS.filter(
    (id) => parseProtoId(id).role === "lark",
  );
  const robinIds = ALL_PROTO_IDS.filter(
    (id) => parseProtoId(id).role === "robin",
  );
  const larksOut = larkIds.every((id) =>
    Dancer.get(id, snappedState).facesOut(),
  );
  const larksAcross = larkIds.every(
    (id) => !Dancer.get(id, snappedState).facesOut(),
  );
  const robinsOut = robinIds.every((id) =>
    Dancer.get(id, snappedState).facesOut(),
  );
  const robinsAcross = robinIds.every(
    (id) => !Dancer.get(id, snappedState).facesOut(),
  );
  if (!((larksOut && robinsAcross) || (larksAcross && robinsOut))) {
    throw new Error(
      `formLongWaves requires all larks facing the same way (across or out) and all robins the opposite`,
    );
  }

  // Compute full final state with hands connected
  return produce(init, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      draft[id].facing = snappedState[id].facing;
      const snapped = Dancer.get(id, snappedState);
      connectHands(
        draft,
        id,
        "left",
        snapped.resolveMatch(personInDir("on_left", "different")).id,
        "left",
      );
      connectHands(
        draft,
        id,
        "right",
        snapped.resolveMatch(personInDir("on_right", "different")).id,
        "right",
      );
    }
  });
}

// ── Plan-based API ──────────────────────────────────────────────────────

export function planFormLongWaves(
  dancer: Dancer,
  finalState: WorldState,
): DancerSegment[] {
  const final = finalState[dancer.protoId];
  return [
    {
      dur: 0,
      facing: () => final.facing,
      hands: () => final.hands,
    },
  ];
}

export function formLongWavesAnimator(
  _instr: FormLongWavesInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const finalState = validateAndComputeFinalState(init, who);
  return animatePlans(init, who, (dancer) =>
    planFormLongWaves(dancer, finalState),
  );
}

// ── Legacy Segment[] API ────────────────────────────────────────────────

export const formLongWavesSegments: InstructionAnimator<
  FormLongWavesInstruction
> = (_instr, init, who) => {
  const finalState = validateAndComputeFinalState(init, who);
  return [
    makeImmediateSegment(init, (id, draft) => {
      draft[id].facing = finalState[id].facing;
      draft[id].hands = finalState[id].hands;
    }),
  ];
};
