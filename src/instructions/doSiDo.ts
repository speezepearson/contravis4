import { z } from "zod";

import { TWO_PI } from "../geometry";
import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";
import { arc, type SegmentAnimator } from "./_segment";

export const DoSiDoInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("do_si_do"),
  cid: CalledIdentifierSchema,
  rotations: z.number(),
});
export type DoSiDoInstruction = z.infer<typeof DoSiDoInstructionSchema>;

export const doSiDoSegments =
  (instr: DoSiDoInstruction): SegmentAnimator =>
  () => [
    {
      dur: instr.beats,
      position: arc(instr.cid, {
        semiMinor: 0.25,
        phi: TWO_PI * instr.rotations,
      }),
    },
  ];
