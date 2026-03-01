import { z } from 'zod';
import { RelationshipSchema, HandSchema, resolveRelationship, type Beats, type ProtoId } from '../contraCore';
import { instructionBaseSchemaFields, type ContraAnimation, type InstructionAnimator } from './_base';
import { produce } from 'immer';
import { ellipsePosition } from '../geometry';
import { type WorldState, buildProtoRecord, getDancerState } from '../worldState';
import type { Vector } from 'vecti';

export const PassByInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('pass_by'), relationship: RelationshipSchema, hand: HandSchema });
export type PassByInstruction = z.infer<typeof PassByInstructionSchema>;

type Plan = {
  arcs: Record<ProtoId, {
    start: Vector;
    end: Vector;
  }>;
};

function makePlan(init: WorldState, instr: PassByInstruction): Plan {
  return {
    arcs: buildProtoRecord((id) => {
      const them = resolveRelationship(id, instr.relationship);
      return {
        start: getDancerState(id, init.protos).pos,
        end: getDancerState(them, init.protos).pos,
      }
    })
  };
}
export const passByAnimator: InstructionAnimator<PassByInstruction> = {
    final(state: WorldState, who: Set<ProtoId>, instr: PassByInstruction): WorldState {
      const plan = makePlan(state, instr);
      return produce(state, (draft) => {
        draft.beat += instr.beats;
        for (const id of who) {
          const arc = plan.arcs[id];
          draft.protos[id].pos = arc.end;
          draft.protos[id].facing = arc.end.subtract(arc.start).normalize();
        }
      });
    },
  
    animate(state: WorldState, who: Set<ProtoId>, instr: PassByInstruction): ContraAnimation {
      const plan = makePlan(state, instr);
      return (t: Beats) => {
        const progressFrac = t / instr.beats;
        return produce(state, (draft) => {
          draft.beat += t;
          for (const id of who) {
            const arc = plan.arcs[id];
            draft.protos[id].pos = ellipsePosition(arc.start, arc.end, 1/2, Math.PI*progressFrac);
            draft.protos[id].facing = arc.end.subtract(arc.start).normalize();
          }
        });
      }
    },
  };
  