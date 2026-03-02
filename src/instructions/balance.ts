import { z } from 'zod';
import { RelationshipSchema, resolveRelationship, type Beats } from '../contraCore';
import { instructionBaseSchemaFields, type InstructionAnimator } from './_base';
import { produce } from 'immer';
import { getDancerState } from '../worldState';
import { lerpVectors } from '../utils';

export const BalanceInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('balance'), relationship: RelationshipSchema });
export type BalanceInstruction = z.infer<typeof BalanceInstructionSchema>;

export const balanceAnimator: InstructionAnimator<BalanceInstruction> = (init, who, instr) => {
  const halfBeats = instr.beats/2;
  return (t) => produce(init, (draft) => {
    draft.beat += t;
    for (const id of who) {
      const them = resolveRelationship(id, instr.relationship);
      const myPos = getDancerState(id, draft.protos).pos;
      const theirPos = getDancerState(them, draft.protos).pos;
      const balanceTo = myPos.multiply(2).add(theirPos).divide(3);
      if (t < halfBeats) {
        const progressFrac = t / halfBeats;
        draft.protos[id].pos = lerpVectors(myPos, balanceTo, progressFrac);
      } else {
        const progressFrac = (t - halfBeats) / halfBeats;
        draft.protos[id].pos = lerpVectors(balanceTo, myPos, progressFrac);
      }
    }
  });
};
