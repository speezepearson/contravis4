import type { Vector } from "vecti";
import { z } from "zod";

import type { ProtoId } from "../contraCore";
import { getDir, lerpFacing } from "../geometry";
import { lerpVectors, must } from "../utils";
import {
  type CalledLabel,
  CalledLabelSchema,
  type DancerState,
  getDancerState,
} from "../worldState";
import {
  type CalledDirection,
  CalledDirectionSchema,
  instructionBaseSchemaFields,
  isCalledDirection,
  resolveCalledDirection,
  resolveCalledIdentifier,
} from "./_base";
import { type SegmentAnimator } from "./_segment";

export const StepInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("step"),
  direction: z.union([CalledDirectionSchema, CalledLabelSchema]),
  distance: z.number(),
  facing: z.union([CalledDirectionSchema, CalledLabelSchema]), // TODO: would be nice to be able to express "the direction towards the the person roughly on your right", which might not be exactly your right
  facingOffset: z.number(),
});
export type StepInstruction = z.infer<typeof StepInstructionSchema>;

// TODO: should this be used more widely, or obliterated?
function getDirToCalledDirOrLabel(
  id: ProtoId,
  dirOrLabel: CalledDirection | CalledLabel,
  protos: Record<ProtoId, DancerState>,
): Vector {
  if (isCalledDirection(dirOrLabel)) {
    return resolveCalledDirection(dirOrLabel, id, protos);
  }
  const themId = must(resolveCalledIdentifier(id, dirOrLabel, protos));
  return getDir({
    from: getDancerState(id, protos).facing,
    to: getDancerState(themId, protos).pos,
  });
}

export const stepSegments =
  (instr: StepInstruction): SegmentAnimator =>
  () => [
    {
      dur: instr.beats,
      position: (id, frac, segInit) => {
        const dir = getDirToCalledDirOrLabel(id, instr.direction, segInit);
        const startPos = getDancerState(id, segInit).pos;
        const finalPos = startPos.add(dir.multiply(instr.distance));
        return lerpVectors(startPos, finalPos, frac);
      },
      facing: (id, frac, segInit) => {
        const dir = getDirToCalledDirOrLabel(id, instr.facing, segInit);
        const finalFacing = dir.rotateByDegrees(instr.facingOffset);
        return lerpFacing(segInit[id].facing, finalFacing, frac);
      },
    },
  ];
