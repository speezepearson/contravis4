import { z } from 'zod';
import { RelationshipSchema, resolveRelationship, type Beats, type ProtoId } from '../contraCore';
import { instructionBaseSchemaFields, type ContraAnimation, type InstructionAnimator } from './_base';
import { produce } from 'immer';
import { type WorldState, getDancerState } from '../worldState';
import { ellipsePosition } from '../geometry';

export const DoSiDoInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('do_si_do'), relationship: RelationshipSchema, rotations: z.number() });
export type DoSiDoInstruction = z.infer<typeof DoSiDoInstructionSchema>;

export const doSiDoAnimator: InstructionAnimator<DoSiDoInstruction> = {
  final(state: WorldState, who: Set<ProtoId>, instr: DoSiDoInstruction): WorldState {
    return produce(state, (draft) => {
      draft.beat += instr.beats;
      for (const id of who) {
        const them = resolveRelationship(id, instr.relationship);
        const myPos = getDancerState(id, draft.protos).pos;
        const theirPos = getDancerState(them, draft.protos).pos;
        draft.protos[id].pos = ellipsePosition(myPos, theirPos, 0.5, 2*Math.PI*instr.rotations);
      }
    });
  },

  animate(state: WorldState, who: Set<ProtoId>, instr: DoSiDoInstruction): ContraAnimation {
    return (t: Beats) => produce(state, (draft) => {
      draft.beat += t;
      for (const id of who) {
        const them = resolveRelationship(id, instr.relationship);
        const myPos = getDancerState(id, draft.protos).pos;
        const theirPos = getDancerState(them, draft.protos).pos;
        draft.protos[id].pos = ellipsePosition(myPos, theirPos, 0.5, 2*Math.PI*instr.rotations);
        draft.protos[id].facing = draft.protos[id].facing.rotateByDegrees(360 * Math.floor(instr.beats/3) * t/instr.beats)
      }
    });
  },
}
