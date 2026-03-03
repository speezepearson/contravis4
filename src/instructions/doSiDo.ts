import { z } from "zod";

import { RelationshipSchema } from "../contraCore";
import { TWO_PI } from "../geometry";
import { type Animator, instructionBaseSchemaFields } from "./_base";
import { arc, makeAnimation } from "./_segment";

export const DoSiDoInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("do_si_do"),
  relationship: RelationshipSchema,
  rotations: z.number(),
});
export type DoSiDoInstruction = z.infer<typeof DoSiDoInstructionSchema>;

export const doSiDoAnimator =
  (instr: DoSiDoInstruction): Animator =>
  (init, who) =>
    makeAnimation(init, who, [
      {
        dur: instr.beats,
        position: arc(instr.relationship, {
          semiMinor: 0.25,
          phi: TWO_PI * instr.rotations,
        }),
      },
    ]);
