import { z } from "zod";

import { lerpFacing } from "../geometry";
import { lerpVectors } from "../utils";
import {
  CalledDirectionSchema,
  instructionBaseSchemaFields,
  resolveCalledDirection,
} from "./_base";
import { type InstructionAnimator } from "./_segment";

export const StepInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("step"),
  direction: CalledDirectionSchema,
  distance: z.number(),
  facing: CalledDirectionSchema, // e.g. "towards_person_on_right" for "the direction towards the person roughly on your right"
});
export type StepInstruction = z.infer<typeof StepInstructionSchema>;

export const stepSegments: InstructionAnimator<StepInstruction> = (instr) => [
  {
    dur: instr.beats,
    position: (dancer, frac) => {
      const dir = resolveCalledDirection(
        dancer.id,
        instr.direction,
        dancer.state,
      );
      const startPos = dancer.pos;
      const finalPos = startPos.add(dir.multiply(instr.distance));
      return lerpVectors(startPos, finalPos, frac);
    },
    facing: (dancer, frac) => {
      const finalFacing = resolveCalledDirection(
        dancer.id,
        instr.facing,
        dancer.state,
      );
      return lerpFacing(dancer.facing, finalFacing, frac);
    },
  },
];
