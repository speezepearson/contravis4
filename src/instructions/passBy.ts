import { z } from 'zod';
import { RelationshipSchema, HandSchema, resolveRelationship, type Beats, type ProtoId } from '../contraCore';
import { instructionBaseSchemaFields, type ContraAnimation, type InstructionAnimator } from './_base';
import { produce } from 'immer';
import { ellipsePosition } from '../geometry';
import { type WorldState, getDancerState } from '../worldState';

export const PassByInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('pass_by'), relationship: RelationshipSchema, hand: HandSchema });
export type PassByInstruction = z.infer<typeof PassByInstructionSchema>;

export const passByAnimator: InstructionAnimator<PassByInstruction> = {
    final(state: WorldState, who: Set<ProtoId>, instr: PassByInstruction): WorldState {
      return produce(state, (draft) => {
        draft.beat += instr.beats;
        for (const id of who) {
          const them = resolveRelationship(id, instr.relationship);
  
          const myPos = state.protos[id].pos;
          const theirPos = getDancerState(them, state.protos).pos;
  
          draft.protos[id].pos = theirPos;
          draft.protos[id].facing = theirPos.subtract(myPos).normalize();
        }
      });
    },
  
    animate(state: WorldState, who: Set<ProtoId>, instr: PassByInstruction): ContraAnimation {
      return (t: Beats) => {
        const progressFrac = t / instr.beats;
        return produce(state, (draft) => {
          draft.beat += t;
          for (const id of who) {
            const them = resolveRelationship(id, instr.relationship);
    
            const myPos = state.protos[id].pos;
            const theirPos = getDancerState(them, state.protos).pos;
  
            draft.protos[id].pos = ellipsePosition(myPos, theirPos, 1/2, Math.PI*progressFrac);
            draft.protos[id].facing = theirPos.subtract(myPos).normalize();
          }
        });
      }
    },
  };
  