import { z } from 'zod';
import { RelationshipSchema, HandSchema, type ProtoId, resolveRelationship, type Beats } from '../contraCore';
import { instructionBaseSchemaFields, revolveDancer, type ContraAnimation, type InstructionAnimator } from './_base';
import { buildProtoRecord, connectHands, getDancerState, type WorldState } from '../worldState';
import { produce } from 'immer';
import type { Vector } from 'vecti';
import { ellipsePosition } from '../geometry';

export const AllemandeInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal('allemande'),
  relationship: RelationshipSchema,
  handedness: HandSchema,
  rotations: z.number(),
});
export type AllemandeInstruction = z.infer<typeof AllemandeInstructionSchema>;

const ALLEMANDE_RADIUS = 1/2;
const FRAC_ELLIPTICAL_ARC_TO_START = 1/4;

type Plan = {
  rotationSign: -1 | 1;
  arcBeats: Beats;
  numCircularRotations: number;
  arcs: Record<ProtoId, {
    start: Vector;
    counterpartStart: Vector;
  }>;
};

function makePlan(init: WorldState, instr: AllemandeInstruction): Plan {
  return {
    arcBeats: Math.min(1, instr.beats/4),
    rotationSign: instr.handedness === 'left' ? 1 : -1,
    numCircularRotations: instr.rotations - FRAC_ELLIPTICAL_ARC_TO_START,
    arcs: buildProtoRecord((id) => {
      const them = resolveRelationship(id, instr.relationship);
      const myPos = getDancerState(id, init.protos).pos;
      const theirPos = getDancerState(them, init.protos).pos;
      return {
        start: myPos,
        counterpartStart: theirPos,
      }
    }),
  };
}

export const allemandeAnimator: InstructionAnimator<AllemandeInstruction> = {
  final(state: WorldState, who: Set<ProtoId>, instr: AllemandeInstruction): WorldState {
    const plan = makePlan(state, instr);
    return produce(state, (draft) => {
      draft.beat += instr.beats;
      for (const id of who) {
        const {start, counterpartStart} = plan.arcs[id];
        const center = start.add(counterpartStart).divide(2);

        draft.protos[id].pos = center.add(start.subtract(center).normalize().multiply(ALLEMANDE_RADIUS));
        draft.protos[id].facing = draft.protos[id].pos.subtract(center).normalize().rotateByDegrees(90 * plan.rotationSign);
        revolveDancer(draft.protos[id], {around: center, rotations: instr.rotations * plan.rotationSign});
        connectHands(draft, id, instr.handedness, instr.relationship, instr.handedness);
      }
    });
  },

  animate(state: WorldState, who: Set<ProtoId>, instr: AllemandeInstruction): ContraAnimation {
    const plan = makePlan(state, instr);
    return (t: Beats) => {
      if (t < plan.arcBeats) {
        const progressFrac = t / plan.arcBeats;
        return produce(state, (draft) => {
          draft.beat += t;
          for (const id of who) {
            const {start, counterpartStart} = plan.arcs[id];
            draft.protos[id].pos = ellipsePosition(start, counterpartStart, ALLEMANDE_RADIUS * plan.rotationSign, Math.PI/4*progressFrac);
          }
        });
      } else {
        const progressFrac = (t - plan.arcBeats) / (instr.beats - plan.arcBeats);
        return produce(state, (draft) => {
          draft.beat += t;
          for (const id of who) {
            const {start, counterpartStart} = plan.arcs[id];
            const center = start.add(counterpartStart).divide(2);
            draft.protos[id].pos = center.add(start.subtract(center).normalize().multiply(ALLEMANDE_RADIUS).rotateByDegrees(90 * plan.rotationSign));
            draft.protos[id].facing = draft.protos[id].pos.subtract(center).normalize().rotateByDegrees(90 * plan.rotationSign);
            revolveDancer(draft.protos[id], {around: center, rotations: plan.numCircularRotations * plan.rotationSign * progressFrac});
            connectHands(draft, id, instr.handedness, instr.relationship, instr.handedness);
          }
        });
      }
    }
  },
}
