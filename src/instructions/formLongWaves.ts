import { produce } from "immer";
import { z } from "zod";

import { ALL_PROTO_IDS, parseProtoId } from "../contraCore";
import { EAST, WEST } from "../geometry";
import { connectHands, Dancer, getDancerSide } from "../worldState";
import { instructionBaseSchemaFields, resolveMatches } from "./_base";
import { type InstructionAnimator, makeImmediateSegment } from "./_segment";

export const FormLongWavesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("form_long_waves"),
  beats: z.literal(0),
});
export type FormLongWavesInstruction = z.infer<
  typeof FormLongWavesInstructionSchema
>;

export const formLongWavesSegments: InstructionAnimator<
  FormLongWavesInstruction
> = (_instr, init, who) => {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`formLongWaves instruction must target all dancers`);

  // Assert one lark on each side, one robin on each side
  for (const role of ["lark", "robin"] as const) {
    const protos = ALL_PROTO_IDS.filter((id) => parseProtoId(id).role === role);
    const sides = new Set(protos.map((id) => getDancerSide(init[id])));
    if (sides.size !== 2)
      throw new Error(
        `formLongWaves requires one ${role} on each side of the set, got sides [${sides}]`,
      );
  }

  // Snap facings to across or out (whichever is closer = EAST or WEST)
  const snappedState = produce(init, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      draft[id].facing = draft[id].facing.x >= 0 ? EAST : WEST;
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

  // Every dancer must have somebody on their left and right; resolveMatches
  // throws if any dancer lacks a match on either side.
  const leftMatches = resolveMatches("person_on_left", snappedState);
  const rightMatches = resolveMatches("person_on_right", snappedState);

  return [
    makeImmediateSegment(init, (id, draft) => {
      draft[id].facing = snappedState[id].facing;
      connectHands(draft, id, "left", leftMatches[id], "left");
      connectHands(draft, id, "right", rightMatches[id], "right");
    }),
  ];
};
