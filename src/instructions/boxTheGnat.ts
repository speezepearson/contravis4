import { z } from "zod";

import { FoilRelationshipSchema, resolveRelationship } from "../contraCore";
import { getDir, PI } from "../geometry";
import { getDancerState } from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";
import { arc, hold, lerpFacingTo, makeAnimation } from "./_segment";

export const BoxTheGnatInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("box_the_gnat"),
  relationship: FoilRelationshipSchema,
});
export type BoxTheGnatInstruction = z.infer<typeof BoxTheGnatInstructionSchema>;

export const boxTheGnatAnimator =
  (instr: BoxTheGnatInstruction): Animator =>
  (init, who) =>
    makeAnimation(init, who, [
      {
        dur: instr.beats,
        position: arc(instr.relationship, { semiMinor: 0.25, phi: PI }),
        facing: lerpFacingTo((id, segInit) => {
          const them = resolveRelationship(id, instr.relationship);
          return getDir({
            from: getDancerState(them, segInit).pos,
            to: segInit[id].pos,
          });
        }),
        hands: hold("right", instr.relationship, "right"),
      },
    ]);
