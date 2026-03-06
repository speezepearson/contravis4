import { z } from "zod";

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { PI, revolve } from "../geometry";
import { lerpVectors } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  facesAcross,
  facesOut,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { type InstructionAnimator, lerpFacingTo } from "./_segment";

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

  const outFacers: ProtoId[] = [];
  const acrossFacers: ProtoId[] = [];
  for (const id of who) {
    if (facesOut(id, init)) {
      outFacers.push(id);
    } else if (facesAcross(id, init)) {
      acrossFacers.push(id);
    } else {
      throw new Error(`${id} is not facing out or across`);
    }
  }
  if (!(outFacers.length === 2 && acrossFacers.length === 2)) {
    throw new Error(
      `boxCirculate requires two dancers to face out and two to face across`,
    );
  }

  return [
    {
      dur: instr.beats,
      position: (id: ProtoId, frac: number, segInit: WorldState) => {
        if (outFacers.includes(id)) {
          const matchId = resolveCalledIdentifier(
            id,
            "person_on_right",
            segInit,
          );
          if (!matchId)
            throw new Error(
              `${id} has nobody on their right to box circulate to`,
            );
          return revolve(segInit[id].pos, {
            aroundMidpointWith: Dancer.get(matchId, segInit).pos,
            radians: -PI * frac,
          });
        } else {
          const matchId = resolveCalledIdentifier(
            id,
            "person_in_front",
            segInit,
          );
          if (!matchId)
            throw new Error(`${id} has nobody in front to box circulate to`);
          return lerpVectors(
            segInit[id].pos,
            Dancer.get(matchId, segInit).pos,
            frac,
          );
        }
      },
      facing: lerpFacingTo(
        (id: ProtoId, segInit: WorldState) => {
          if (outFacers.includes(id)) {
            return segInit[id].facing.rotateByRadians(PI);
          }
          return segInit[id].facing;
        },
        { forceDir: () => "cw" },
      ),
      hands: () => ({}),
    },
  ];
};
