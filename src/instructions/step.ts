import { z } from "zod";
import {
  instructionBaseSchemaFields,
  RelativeDirectionSchema,
  resolveRelativeDirection,
  type InstructionAnimator,
} from "./_base";
import { produce } from "immer";
import { lerpFacing } from "../geometry";
import { lerpVectors } from "../utils";
import { buildProtoRecord, getDancerState } from "../worldState";

export const StepInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("step"),
  direction: RelativeDirectionSchema,
  distance: z.number(),
  facing: RelativeDirectionSchema,
  facingOffset: z.number(),
});
export type StepInstruction = z.infer<typeof StepInstructionSchema>;

export const stepAnimator: InstructionAnimator<StepInstruction> = (
  init,
  who,
  instr,
) => {
  const plans = buildProtoRecord((id) => {
    const dir = resolveRelativeDirection(instr.direction, id, init.protos);
    const finalFacing = resolveRelativeDirection(
      instr.facing,
      id,
      init.protos,
    ).rotateByDegrees(instr.facingOffset);
    const startPos = getDancerState(id, init.protos).pos;
    const finalPos = startPos.add(dir.multiply(instr.distance));
    return { finalPos, finalFacing };
  });

  return {
    dur: instr.beats,
    getFrame(t) {
      return produce(init, (draft) => {
        draft.beat += t;
        const progressFrac = instr.beats > 0 ? t / instr.beats : 1;
        for (const id of who) {
          const plan = plans[id];
          draft.protos[id].pos = lerpVectors(
            init.protos[id].pos,
            plan.finalPos,
            progressFrac,
          );
          draft.protos[id].facing = lerpFacing(
            init.protos[id].facing,
            plan.finalFacing,
            progressFrac,
          );
        }
      });
    },
  };
};
