import { produce } from "immer";
import { z } from "zod";

import { RelationshipSchema, resolveRelationship } from "../contraCore";
import { lerpVectors } from "../utils";
import { buildProtoRecord, getDancerState } from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";

export const BalanceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("balance"),
  relationship: RelationshipSchema,
});
export type BalanceInstruction = z.infer<typeof BalanceInstructionSchema>;

export const balanceAnimator =
  (instr: BalanceInstruction): Animator =>
  (init, who) => {
    const halfBeats = instr.beats / 2;

    const balancePoints = buildProtoRecord((id) => {
      const them = resolveRelationship(id, instr.relationship);
      const myPos = getDancerState(id, init).pos;
      const theirPos = getDancerState(them, init).pos;
      return myPos.multiply(2).add(theirPos).divide(3);
    });

    return {
      dur: instr.beats,
      getFrame(t) {
        return produce(init, (draft) => {
          for (const id of who) {
            const myPos = init[id].pos;
            const balancePoint = balancePoints[id];
            if (t < halfBeats) {
              const progressFrac = t / halfBeats;
              draft[id].pos = lerpVectors(myPos, balancePoint, progressFrac);
            } else {
              const progressFrac = (t - halfBeats) / halfBeats;
              draft[id].pos = lerpVectors(balancePoint, myPos, progressFrac);
            }
          }
        });
      },
    };
  };
