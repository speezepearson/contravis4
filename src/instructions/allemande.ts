import { z } from 'zod';
import { RelationshipSchema, HandSchema, type ProtoId, resolveRelationship } from '../contraCore';
import { instructionBaseSchemaFields, type InstructionAnimator } from './_base';
import { connectHands, getDancerState, type WorldState } from '../worldState';
import { produce } from 'immer';

export const AllemandeInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal('allemande'),
  relationship: RelationshipSchema,
  handedness: HandSchema,
  rotations: z.number(),
});
export type AllemandeInstruction = z.infer<typeof AllemandeInstructionSchema>;

const ALLEMANDE_RADIUS = 1/2;

export const allemandeAnimator: InstructionAnimator<AllemandeInstruction> = {
  final(state: WorldState, who: Set<ProtoId>, instr: AllemandeInstruction): WorldState {
    return produce(state, (draft) => {
      draft.beat += instr.beats;
      for (const id of who) {
        const them = resolveRelationship(id, instr.relationship);

        const myPos = state.protos[id].pos;
        const theirPos = getDancerState(them, state.protos).pos;
        const center = myPos.add(theirPos).divide(2);

        const myFinalPos = center.add(
          myPos.subtract(center).normalize()
          .multiply(ALLEMANDE_RADIUS)
          .rotateByDegrees(360 * instr.rotations * (instr.handedness === 'left' ? 1 : -1)));

        draft.protos[id].pos = myFinalPos;
        draft.protos[id].facing = myFinalPos.subtract(center).normalize().rotateByDegrees(90 * (instr.handedness === 'left' ? 1 : -1));
        connectHands(draft, id, instr.handedness, instr.relationship, instr.handedness);
      }
    });
  },
}
