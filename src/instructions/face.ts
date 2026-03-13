import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { Dancer, type WorldState } from "../worldState";
import {
  CalledDirectionSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const FaceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("face"),
  beats: z.literal(0),
  direction: CalledDirectionSchema,
});
export type FaceInstruction = z.infer<typeof FaceInstructionSchema>;

export function planFace(
  instr: FaceInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const targetFacing = dancer.resolveCalledDirection(instr.direction);
  return [{ dur: 0, facing: () => targetFacing }];
}

export function faceAnimator(
  instr: FaceInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planFace(instr, dancer));
}
