import { z } from "zod";

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { PI, revolve } from "../geometry";
import { lerpVectors } from "../utils";
import {
  buildProtoRecord,
  getDancerState,
  type WorldState,
} from "../worldState";
import {
  facesAcross,
  facesOut,
  findDancerInCalledDirection,
  instructionBaseSchemaFields,
  resolveMatch,
} from "./_base";
import { type InstructionAnimator } from "./_segment";

export const BoxCirculateInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("box_circulate"),
});
export type BoxCirculateInstruction = z.infer<
  typeof BoxCirculateInstructionSchema
>;

export const boxCirculateSegments: InstructionAnimator<
  BoxCirculateInstruction
> = (instr, init, who) => {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`boxCirculate instruction must target all dancers`);

  for (const id of ALL_PROTO_IDS) {
    if (!facesOut(id, init) && !facesAcross(id, init)) {
      throw new Error(
        `boxCirculate requires every dancer to face out or across`,
      );
    }
  }

  const isOut = buildProtoRecord((id) => facesOut(id, init));
  const targets = buildProtoRecord((id) => {
    if (isOut[id]) {
      const them = resolveMatch(id, "in right hand", init);
      return getDancerState(them, init).pos;
    } else {
      const them = findDancerInCalledDirection(id, "in_front", init);
      if (!them) {
        throw new Error(
          `boxCirculate: ${id} faces across but has no dancer in front`,
        );
      }
      return getDancerState(them, init).pos;
    }
  });

  return [
    {
      dur: instr.beats,
      position: (id: ProtoId, frac: number, segInit: WorldState) => {
        if (isOut[id]) {
          return revolve(segInit[id].pos, {
            aroundMidpointWith: targets[id],
            radians: -PI * frac,
          });
        }
        return lerpVectors(segInit[id].pos, targets[id], frac);
      },
      facing: (id: ProtoId, frac: number, segInit: WorldState) => {
        if (isOut[id]) {
          return segInit[id].facing.rotateByRadians(-PI * frac);
        }
        return segInit[id].facing;
      },
      hands: () => ({}),
    },
  ];
};
