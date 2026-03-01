import { z } from 'zod';
import { RelationshipSchema, HandSchema, resolveRelationship, type ProtoId, type Beats } from '../contraCore';
import { instructionBaseSchemaFields, type ContraAnimation, type InstructionAnimator } from './_base';
import { produce } from 'immer';
import { type WorldState, getDancerState, connectHands, buildProtoRecord } from '../worldState';
import { ellipsePosition } from '../geometry';
import type { Vector } from 'vecti';

export const PullByInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('pull_by'), relationship: RelationshipSchema, hand: HandSchema });
export type PullByInstruction = z.infer<typeof PullByInstructionSchema>;

type Plan = {
  semiMinorCw: number;
  arcs: Record<ProtoId, {
    start: Vector;
    end: Vector;
  }>;
};

function makePlan(init: WorldState, instr: PullByInstruction): Plan {
  return {
    semiMinorCw: 1/2 * {left: -1, right: 1}[instr.hand],
    arcs: buildProtoRecord((id) => {
      const them = resolveRelationship(id, instr.relationship);
      return {
        start: getDancerState(id, init.protos).pos,
        end: getDancerState(them, init.protos).pos,
      }
    })
  };
}

export const pullByAnimator: InstructionAnimator<PullByInstruction> = {
  final(state: WorldState, who: Set<ProtoId>, instr: PullByInstruction): WorldState {
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

  animate(state: WorldState, who: Set<ProtoId>, instr: PullByInstruction): ContraAnimation {
    const plan = makePlan(state, instr);
    return (t: Beats) => {
      const progressFrac = t / instr.beats;
      return produce(state, (draft) => {
        draft.beat += t;
        for (const id of who) {
          const arc = plan.arcs[id];
          draft.protos[id].pos = ellipsePosition(arc.start, arc.end, plan.semiMinorCw, Math.PI*progressFrac);
          draft.protos[id].facing = arc.end.subtract(arc.start).normalize();
          if (progressFrac < 0.5) connectHands(draft, id, instr.hand, instr.relationship, instr.hand);
        }
      });
    }
  },
};
