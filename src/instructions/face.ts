import { z } from "zod";

import {
  CalledDirectionSchema,
  instructionBaseSchemaFields,
  resolveCalledDirection,
} from "./_base";
import { type SegmentAnimator } from "./_segment";

export const FaceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("face"),
  beats: z.literal(0),
  direction: CalledDirectionSchema,
});
export type FaceInstruction = z.infer<typeof FaceInstructionSchema>;

export const faceSegments =
  (instr: FaceInstruction): SegmentAnimator =>
  () => [
    {
      dur: instr.beats,
      facing: (id, _frac, segInit) => {
        return resolveCalledDirection(id, instr.direction, segInit);
      },
    },
  ];
