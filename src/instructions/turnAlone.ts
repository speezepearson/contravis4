import { z } from "zod";

import { isLark } from "../contraCore";
import { PI } from "../geometry";
import { InstructionIdSchema } from "./_base";
import { rotateFacingBy, type SegmentAnimator } from "./_segment";

export const TurnAloneInstructionSchema = z.object({
  id: InstructionIdSchema,
  beats: z.number().int().default(2),
  type: z.literal("turn_alone"),
});
export type TurnAloneInstruction = z.infer<typeof TurnAloneInstructionSchema>;

export const turnAloneSegments =
  (instr: TurnAloneInstruction): SegmentAnimator =>
  () => [
    {
      dur: instr.beats,
      facing: rotateFacingBy((id) => (isLark(id) ? -PI : PI)),
    },
  ];
