import { z } from "zod";
import { RelationshipSchema, resolveRelationship } from "../contraCore";
import { instructionBaseSchemaFields, type InstructionAnimator } from "./_base";
import { produce } from "immer";
import { buildProtoRecord, getDancerState } from "../worldState";
import { lerpVectors } from "../utils";

export const BalanceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("balance"),
  relationship: RelationshipSchema,
});
export type BalanceInstruction = z.infer<typeof BalanceInstructionSchema>;

export const balanceAnimator: InstructionAnimator<BalanceInstruction> = (
  init,
  who,
  instr,
) => {
  const halfBeats = instr.beats / 2;

  const balancePoints = buildProtoRecord((id) => {
    const them = resolveRelationship(id, instr.relationship);
    const myPos = getDancerState(id, init.protos).pos;
    const theirPos = getDancerState(them, init.protos).pos;
    return myPos.multiply(2).add(theirPos).divide(3);
  });

  return {
    dur: instr.beats,
    getFrame(t) {
      return produce(init, (draft) => {
        draft.beat += t;
        for (const id of who) {
          const myPos = init.protos[id].pos;
          const balancePoint = balancePoints[id];
          if (t < halfBeats) {
            const progressFrac = t / halfBeats;
            draft.protos[id].pos = lerpVectors(myPos, balancePoint, progressFrac);
          } else {
            const progressFrac = (t - halfBeats) / halfBeats;
            draft.protos[id].pos = lerpVectors(balancePoint, myPos, progressFrac);
          }
        }
      });
    },
  };
};
