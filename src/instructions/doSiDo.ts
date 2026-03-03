import { z } from "zod";

import { RelationshipSchema } from "../contraCore";
import { TWO_PI } from "../geometry";
import { instructionBaseSchemaFields } from "./_base";
import { arc, type SegmentAnimator } from "./_segment";

export const DoSiDoInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("do_si_do"),
  relationship: RelationshipSchema,
  rotations: z.number(),
});
export type DoSiDoInstruction = z.infer<typeof DoSiDoInstructionSchema>;

export const doSiDoSegments =
  (instr: DoSiDoInstruction): SegmentAnimator =>
  () => [
    {
      dur: instr.beats,
      position: arc(instr.relationship, {
        semiMinor: 0.25,
        phi: TWO_PI * instr.rotations,
      }),
    },
  ];
