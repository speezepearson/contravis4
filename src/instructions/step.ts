import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { lerpFacing } from "../geometry";
import { lerpVectors } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  CalledDirectionSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const StepInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("step"),
  direction: CalledDirectionSchema,
  distance: z.number(),
  facing: CalledDirectionSchema, // e.g. "towards_person_on_right" for "the direction towards the person roughly on your right"
});
export type StepInstruction = z.infer<typeof StepInstructionSchema>;

export function planStep(
  instr: StepInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const dir = dancer.resolveCalledDirection(instr.direction);
  const startPos = dancer.pos;
  const finalPos = startPos.add(dir.multiply(instr.distance));
  const startFacing = dancer.facing;
  const finalFacing = dancer.resolveCalledDirection(instr.facing);

  return [
    {
      dur: instr.beats,
      position: (frac) => lerpVectors(startPos, finalPos, frac),
      facing: (frac) => lerpFacing(startFacing, finalFacing, frac),
    },
  ];
}

export function stepAnimator(
  instr: StepInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planStep(instr, dancer));
}
