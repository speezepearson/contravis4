import { z } from "zod";

import { isLark } from "../contraCore";
import { PI } from "../geometry";
import { instructionBaseSchemaFields } from "./_base";
import { type InstructionAnimator, rotateFacingBy } from "./_segment";

export const TurnAloneInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("turn_alone"),
});
export type TurnAloneInstruction = z.infer<typeof TurnAloneInstructionSchema>;

export const turnAloneSegments: InstructionAnimator<TurnAloneInstruction> = (
  instr,
) => [
  {
    dur: instr.beats,
    facing: rotateFacingBy((dancer) => (isLark(dancer.protoId) ? -PI : PI)),
  },
];
