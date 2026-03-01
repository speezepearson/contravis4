import { z } from 'zod';
import { FoilRelationshipSchema, resolveRelationship, type ProtoId } from '../contraCore';
import { instructionBaseSchemaFields, type InstructionAnimator } from './_base';
import { produce } from 'immer';
import { getDancerState, connectHands, type WorldState } from '../worldState';

export const BoxTheGnatInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('box_the_gnat'), relationship: FoilRelationshipSchema });
export type BoxTheGnatInstruction = z.infer<typeof BoxTheGnatInstructionSchema>;

export const boxTheGnatAnimator: InstructionAnimator<BoxTheGnatInstruction> = {
  final(state: WorldState, who: Set<ProtoId>, instr: BoxTheGnatInstruction): WorldState {
    return produce(state, (draft) => {
      draft.beat += instr.beats;
      for (const id of who) {
        const them = resolveRelationship(id, instr.relationship);

        const myPos = state.protos[id].pos;
        const theirPos = getDancerState(them, state.protos).pos;

        draft.protos[id].pos = theirPos;
        draft.protos[id].facing = myPos.subtract(theirPos).normalize();
        connectHands(draft, id, 'right', instr.relationship, 'right');
      }
    });
  },
}
