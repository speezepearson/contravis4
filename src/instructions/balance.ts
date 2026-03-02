import { z } from 'zod';
import { RelationshipSchema, resolveRelationship, type Beats, type ProtoId } from '../contraCore';
import { instructionBaseSchemaFields, type ContraAnimation, type InstructionAnimator } from './_base';
import { produce } from 'immer';
import { getDancerState, type WorldState } from '../worldState';
import { lerpVectors } from '../utils';

export const BalanceInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('balance'), relationship: RelationshipSchema });
export type BalanceInstruction = z.infer<typeof BalanceInstructionSchema>;

export const balanceAnimator: InstructionAnimator<BalanceInstruction> = {
  final(state: WorldState, _who: Set<ProtoId>, instr: BalanceInstruction): WorldState {
    return produce(state, (draft) => {
      draft.beat += instr.beats;
      // balance is a no-op, ends exactly where it started
    });
  },

  animate(state: WorldState, who: Set<ProtoId>, instr: BalanceInstruction): ContraAnimation {
    const halfBeats = instr.beats/2;
    return (t: Beats) => produce(state, (draft) => {
      draft.beat += t;
      for (const id of who) {
        const them = resolveRelationship(id, instr.relationship);
        const myPos = getDancerState(id, draft.protos).pos;
        const theirPos = getDancerState(them, draft.protos).pos;
        const balanceTo = myPos.multiply(2).add(theirPos).divide(3);
        if (t < halfBeats) {
          draft.protos[id].pos = lerpVectors(myPos, balanceTo, t/halfBeats);
        } else {
          draft.protos[id].pos = lerpVectors(balanceTo, myPos, (t-halfBeats)/halfBeats);
        }
      }
    });
  },
}
