import { produce } from "immer";
import { z } from "zod";

import { lerpFacing } from "../geometry";
import { lerpVectors } from "../utils";
import { buildProtoRecord, getDancerState } from "../worldState";
import {
  type Animator,
  instructionBaseSchemaFields,
  RelativeDirectionSchema,
  resolveRelativeDirection,
} from "./_base";

export const StepInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("step"),
  direction: RelativeDirectionSchema,
  distance: z.number(),
  facing: RelativeDirectionSchema,
  facingOffset: z.number(),
});
export type StepInstruction = z.infer<typeof StepInstructionSchema>;

export const stepAnimator =
  (instr: StepInstruction): Animator =>
  (init, who) => {
    const plans = buildProtoRecord((id) => {
      const dir = resolveRelativeDirection(instr.direction, id, init);
      const finalFacing = resolveRelativeDirection(
        instr.facing,
        id,
        init,
      ).rotateByDegrees(instr.facingOffset);
      const startPos = getDancerState(id, init).pos;
      const finalPos = startPos.add(dir.multiply(instr.distance));
      return { finalPos, finalFacing };
    });

    return {
      dur: instr.beats,
      getFrame(t) {
        return produce(init, (draft) => {
          const progressFrac = instr.beats > 0 ? t / instr.beats : 1;
          for (const id of who) {
            const plan = plans[id];
            draft[id].pos = lerpVectors(
              init[id].pos,
              plan.finalPos,
              progressFrac,
            );
            draft[id].facing = lerpFacing(
              init[id].facing,
              plan.finalFacing,
              progressFrac,
            );
          }
        });
      },
    };
  };
