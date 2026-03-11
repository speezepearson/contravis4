import { z } from "zod";

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { PI, revolve } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { lerpVectors } from "../utils";
import { Dancer } from "../worldState";
import { instructionBaseSchemaFields, personInDir } from "./_base";
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
      throw new SnazzyError([{ dancerId: id }, " is not facing out or across"]);
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
          const match = dancer.resolveCalledIdentifier(
            personInDir("on_right", "different"),
          );
          if (!match)
            throw new SnazzyError([
              { dancerId: dancer.protoId },
              " has nobody on their right to box circulate to",
            ]);
          return revolve(dancer.pos, {
            aroundMidpointWith: match.pos,
            radians: -PI * frac,
          });
        } else {
          const match = dancer.resolveCalledIdentifier(
            personInDir("in_front", "different"),
          );
          if (!match)
            throw new SnazzyError([
              { dancerId: dancer.protoId },
              " has nobody in front to box circulate to",
            ]);
          return lerpVectors(dancer.pos, match.pos, frac);
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
