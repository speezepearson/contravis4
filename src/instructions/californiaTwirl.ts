import { z } from 'zod';
import { instructionBaseSchemaFields, type InstructionAnimator } from './_base';
import { otherHand, parseProtoId, resolveRelationship, type ProtoId } from '../contraCore';
import { produce } from 'immer';
import { getDancerState, connectHands, type WorldState } from '../worldState';

export const CaliforniaTwirlInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('california_twirl') });
export type CaliforniaTwirlInstruction = z.infer<typeof CaliforniaTwirlInstructionSchema>;

export const californiaTwirlAnimator: InstructionAnimator<CaliforniaTwirlInstruction> = {
  final(state: WorldState, who: Set<ProtoId>, instr: CaliforniaTwirlInstruction): WorldState {
    return produce(state, (draft) => {
      draft.beat += instr.beats;
      for (const id of who) {
        const myRole = parseProtoId(id).role;
        const myHands = state.protos[id].hands;
        const twirlHand = myRole === 'robin' ? 'left' : 'right';
        if (!myHands[twirlHand]) throw new Error(`Dancer ${id} has nobody in their hand to California twirl with`);
        if (myHands[otherHand(twirlHand)]) throw new Error(`Dancer ${id} has to drop their other hand before California twirling`);

        const them = resolveRelationship(id, myHands[twirlHand][0]);

        const myPos = state.protos[id].pos;
        const theirPos = getDancerState(them, state.protos).pos;

        draft.protos[id].pos = theirPos;
        draft.protos[id].facing = myPos.subtract(theirPos).normalize().rotateByDegrees(90 * (myRole === 'lark' ? 1 : -1));
        connectHands(draft, id, twirlHand, myHands[twirlHand][0], otherHand(twirlHand));
      }
    });
  },
}
