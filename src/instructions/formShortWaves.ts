import { Vector } from "vecti";
import { z } from "zod";

import { ALL_PROTO_IDS, parseProtoId, type ProtoId } from "../contraCore";
import { NORTH, SOUTH } from "../geometry";
import { connectHands } from "../worldState";
import {
  findDancerInCalledDirection,
  instructionBaseSchemaFields,
} from "./_base";
import { type InstructionAnimator, makeImmediateSegment } from "./_segment";

export const FormShortWavesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("form_short_waves"),
  beats: z.literal(0),
});
export type FormShortWavesInstruction = z.infer<
  typeof FormShortWavesInstructionSchema
>;

const SHORT_WAVES_XS = [-0.75, -0.25, 0.25, 0.75] as const;

export const formShortWavesSegments: InstructionAnimator<
  FormShortWavesInstruction
> = (_instr, init, who) => {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`formShortWaves instruction must target all dancers`);

  const protosWestToEast = ([...ALL_PROTO_IDS] as ProtoId[]).sort(
    (a, b) => init[a].pos.x - init[b].pos.x,
  );
  if (
    parseProtoId(protosWestToEast[1]).role !==
    parseProtoId(protosWestToEast[2]).role
  ) {
    throw new Error(`dancers in middle of short waves do not have same role`);
  }

  return [
    makeImmediateSegment(init, (id, draft) => {
      const i = protosWestToEast.indexOf(id);
      draft[id].pos = new Vector(SHORT_WAVES_XS[i], init[id].pos.y);
      draft[id].facing = init[id].facing.y > 0 ? NORTH : SOUTH;
      const onLeft = findDancerInCalledDirection(id, "on_left", draft);
      const onRight = findDancerInCalledDirection(id, "on_right", draft);
      if (onLeft) connectHands(draft, id, "left", onLeft, "left");
      if (onRight) connectHands(draft, id, "right", onRight, "right");
    }),
  ];
};
