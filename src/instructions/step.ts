import { z } from "zod";

import { lerpFacing } from "../geometry";
import { lerpVectors } from "../utils";
import { Dancer } from "../worldState";
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
    position: (id, frac, segInit) => {
      const dir = resolveCalledDirection(id, instr.direction, segInit);
      const startPos = Dancer.get(id, segInit).pos;
      const finalPos = startPos.add(dir.multiply(instr.distance));
      return lerpVectors(startPos, finalPos, frac);
    },
    facing: (id, frac, segInit) => {
      const finalFacing = resolveCalledDirection(id, instr.facing, segInit);
      return lerpFacing(segInit[id].facing, finalFacing, frac);
    },
  },
];
