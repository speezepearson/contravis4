import { z } from "zod";

import { lerpFacing } from "../geometry";
import { lerpVectors } from "../utils";
import { getDancerState } from "../worldState";
import {
  instructionBaseSchemaFields,
  RelativeDirectionSchema,
  resolveRelativeDirection,
} from "./_base";
import { type SegmentAnimator } from "./_segment";

export const StepInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("step"),
  direction: RelativeDirectionSchema,
  distance: z.number(),
  facing: RelativeDirectionSchema,
  facingOffset: z.number(),
});
export type StepInstruction = z.infer<typeof StepInstructionSchema>;

export const stepSegments =
  (instr: StepInstruction): SegmentAnimator =>
  () => [
    {
      dur: instr.beats,
      position: (id, frac, segInit) => {
        const dir = resolveRelativeDirection(instr.direction, id, segInit);
        const startPos = getDancerState(id, segInit).pos;
        const finalPos = startPos.add(dir.multiply(instr.distance));
        return lerpVectors(startPos, finalPos, frac);
      },
      facing: (id, frac, segInit) => {
        const finalFacing = resolveRelativeDirection(
          instr.facing,
          id,
          segInit,
        ).rotateByDegrees(instr.facingOffset);
        return lerpFacing(segInit[id].facing, finalFacing, frac);
      },
    },
  ];
