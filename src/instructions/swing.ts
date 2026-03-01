import { z } from 'zod';
import { FoilRelationshipSchema, parseProtoId, resolveRelationship, type ProtoId } from '../contraCore';
import { instructionBaseSchemaFields, type InstructionAnimator, RelativeDirectionSchema, resolveRelativeDirection } from './_base';
import { produce } from 'immer';
import { getDancerState, connectHands, type WorldState } from '../worldState';

export const SwingInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('swing'), relationship: FoilRelationshipSchema, endFacing: RelativeDirectionSchema });
export type SwingInstruction = z.infer<typeof SwingInstructionSchema>;

const SWING_FINAL_SEPARATION = 1;

export const swingAnimator: InstructionAnimator<SwingInstruction> = {
  final(state: WorldState, who: Set<ProtoId>, instr: SwingInstruction): WorldState {
    return produce(state, (draft) => {
      draft.beat += instr.beats;
      for (const id of who) {
        const myRole = parseProtoId(id).role;
        const them = resolveRelationship(id, instr.relationship);

        const myPos = state.protos[id].pos;
        const theirPos = getDancerState(them, state.protos).pos;
        const center = myPos.add(theirPos).divide(2);

        const myFinalFacing = resolveRelativeDirection(instr.endFacing, state.protos[id], id, state.protos);
        const myFinalPos = center.add(
          myFinalFacing.multiply(SWING_FINAL_SEPARATION / 2)
          .rotateByDegrees(90 * (myRole === 'lark' ? 1 : -1)));

        draft.protos[id].pos = myFinalPos;
        draft.protos[id].facing = myFinalFacing;
        connectHands(draft, id, myRole === 'lark' ? 'right' : 'left', instr.relationship, myRole === 'lark' ? 'left' : 'right');
      }
    });
  },
}
