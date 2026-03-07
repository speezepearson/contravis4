import { z } from "zod";

import { HandSchema } from "../contraCore";
import { PI } from "../geometry";
import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";
import { arc, type InstructionAnimator } from "./_segment";

export const PassByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pass_by"),
  cid: CalledIdentifierSchema,
  hand: HandSchema,
});
export type PassByInstruction = z.infer<typeof PassByInstructionSchema>;

export const passBySegments: InstructionAnimator<PassByInstruction> = (
  instr,
) => [
  {
    dur: instr.beats,
    position: arc(instr.cid, {
      semiMinor: 0.25 * { left: -1, right: 1 }[instr.hand],
      phi: PI,
    }),
    facing: (dancer) => {
      const them = dancer.resolveMatch(instr.cid);
      return them.pos.subtract(dancer.pos).normalize();
    },
    hands: () => ({}),
  },
];
