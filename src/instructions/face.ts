import { z } from "zod";

import { CalledDirectionSchema, instructionBaseSchemaFields } from "./_base";
import { type InstructionAnimator, type Segment } from "./_segment";

export const FaceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("face"),
  beats: z.literal(0),
  direction: CalledDirectionSchema,
});
export type FaceInstruction = z.infer<typeof FaceInstructionSchema>;

export const faceSegments: InstructionAnimator<FaceInstruction> = (
  instr,
): Segment[] => [
  {
    dur: instr.beats,
    facing: (dancer) => {
      return dancer.resolveCalledDirection(instr.direction);
    },
  },
];
