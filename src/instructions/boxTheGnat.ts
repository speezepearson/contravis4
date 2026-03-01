import { z } from 'zod';
import { FoilRelationshipSchema, resolveRelationship, type Beats, type ProtoId } from '../contraCore';
import { instructionBaseSchemaFields, type ContraAnimation, type InstructionAnimator } from './_base';
import { produce } from 'immer';
import { getDancerState, connectHands, type WorldState, buildProtoRecord } from '../worldState';
import type { Vector } from 'vecti';
import { ellipsePosition } from '../geometry';

export const BoxTheGnatInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('box_the_gnat'), relationship: FoilRelationshipSchema });
export type BoxTheGnatInstruction = z.infer<typeof BoxTheGnatInstructionSchema>;

type Plan = {
  arcs: Record<ProtoId, {
    start: Vector;
    end: Vector;
  }>;
};

function makePlan(init: WorldState, instr: BoxTheGnatInstruction): Plan {
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

export const boxTheGnatAnimator: InstructionAnimator<BoxTheGnatInstruction> = {
  final(state: WorldState, who: Set<ProtoId>, instr: BoxTheGnatInstruction): WorldState {
    const plan = makePlan(state, instr);
    return produce(state, (draft) => {
      draft.beat += instr.beats;
      for (const id of who) {
        const arc = plan.arcs[id];
        draft.protos[id].pos = arc.end;
        draft.protos[id].facing = arc.end.subtract(arc.start).normalize();
        connectHands(draft, id, 'right', instr.relationship, 'right');
      }
    });
  },

  animate(state: WorldState, who: Set<ProtoId>, instr: BoxTheGnatInstruction): ContraAnimation {
    const plan = makePlan(state, instr);
    return (t: Beats) => {
      const progressFrac = t / instr.beats;
      return produce(state, (draft) => {
        draft.beat += t;
        for (const id of who) {
          const arc = plan.arcs[id];
          draft.protos[id].pos = ellipsePosition(arc.start, arc.end, 1/2, Math.PI*progressFrac);
          draft.protos[id].facing = arc.end.subtract(arc.start).normalize();
          connectHands(draft, id, 'right', instr.relationship, 'right');
        }
      });
    }
  },
}
