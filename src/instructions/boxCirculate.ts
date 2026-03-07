import { z } from "zod";

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { PI, revolve } from "../geometry";
import { lerpVectors } from "../utils";
import { Dancer } from "../worldState";
import { instructionBaseSchemaFields } from "./_base";
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
    if (Dancer.get(id, init).facesOut()) {
      outFacers.push(id);
    } else if (Dancer.get(id, init).facesAcross()) {
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
      position: (dancer, frac) => {
        if (outFacers.includes(dancer.protoId)) {
          const matchId = dancer.resolveCalledIdentifier("person_on_right");
          if (!matchId)
            throw new Error(
              `${dancer.protoId} has nobody on their right to box circulate to`,
            );
          return revolve(dancer.pos, {
            aroundMidpointWith: Dancer.get(matchId, dancer.state).pos,
            radians: -PI * frac,
          });
        } else {
          const matchId = dancer.resolveCalledIdentifier("person_in_front");
          if (!matchId)
            throw new Error(
              `${dancer.protoId} has nobody in front to box circulate to`,
            );
          return lerpVectors(
            dancer.pos,
            Dancer.get(matchId, dancer.state).pos,
            frac,
          );
        }
      },
      facing: lerpFacingTo(
        (dancer) => {
          if (outFacers.includes(dancer.protoId)) {
            return dancer.facing.rotateByRadians(PI);
          }
          return dancer.facing;
        },
        { forceDir: () => "cw" },
      ),
      hands: () => ({}),
    },
  ];
};
