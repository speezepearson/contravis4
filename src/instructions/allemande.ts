import { z } from 'zod';
import { RelationshipSchema, HandSchema, type ProtoId, resolveRelationship, type Beats } from '../contraCore';
import { instructionBaseSchemaFields, type ContraAnimation, type InstructionAnimator } from './_base';
import { buildProtoRecord, connectHands, getDancerState, type WorldState } from '../worldState';
import { produce } from 'immer';
import type { Vector } from 'vecti';
import { ellipsePosition, getDir, lerpFacing, revolve } from '../geometry';

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
  approachBeats: Beats;
  numAllemandeRadians: number;
  rotationSign: number;
  perProto: Record<ProtoId, {
    start: Vector;
    counterpartStart: Vector;
    afterApproach: {pos: Vector; facing: Vector};
    center: Vector;
    final: {pos: Vector; facing: Vector};
  }>;
};

function makePlan(init: WorldState, instr: AllemandeInstruction): Plan {
  const rotationSign = instr.handedness === 'left' ? 1 : -1;
  return {
    approachBeats: Math.min(1, instr.beats/4),
    numAllemandeRadians: (2*Math.PI*instr.rotations - FRAC_ELLIPTICAL_ARC_TO_START) * rotationSign,
    rotationSign,
    perProto: buildProtoRecord((id) => {
      const them = resolveRelationship(id, instr.relationship);
      const myPos = getDancerState(id, init.protos).pos;
      const theirPos = getDancerState(them, init.protos).pos;
      const center = myPos.add(theirPos).divide(2);

      const finalPos = center.add(getDir({from: center, to: myPos}).multiply(ALLEMANDE_RADIUS).rotateByDegrees(360 * instr.rotations * rotationSign))
      return {
        start: myPos,
        counterpartStart: theirPos,
        afterApproach: {
          pos: ellipsePosition(myPos, theirPos, ALLEMANDE_RADIUS, FRAC_ELLIPTICAL_ARC_TO_START),
          facing: getDir({from: myPos, to: center}),
        },
        center,
        final: {
          pos: finalPos,
          facing: getDir({from: center, to: finalPos}).rotateByDegrees(90 * rotationSign),
        }
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
        const {final} = plan.perProto[id];
        draft.protos[id].pos = final.pos;
        draft.protos[id].facing = final.facing;
        connectHands(draft, id, instr.handedness, instr.relationship, instr.handedness);
      }
    });
  },

  animate(state: WorldState, who: Set<ProtoId>, instr: AllemandeInstruction): ContraAnimation {
    const plan = makePlan(state, instr);
    return (t: Beats) => produce(state, (draft) => {
      draft.beat += t;
      if (t < plan.approachBeats) {
        const progressFrac = t / plan.approachBeats;
        for (const id of who) {
          const {afterApproach, counterpartStart} = plan.perProto[id];
          draft.protos[id].pos = ellipsePosition(state.protos[id].pos, counterpartStart, ALLEMANDE_RADIUS * plan.rotationSign, FRAC_ELLIPTICAL_ARC_TO_START * progressFrac);
          draft.protos[id].facing = lerpFacing(state.protos[id].facing, afterApproach.facing, progressFrac);
        }
      } else {
        const progressFrac = (t - plan.approachBeats) / (instr.beats - plan.approachBeats);
        for (const id of who) {
          const {afterApproach, center} = plan.perProto[id];
          draft.protos[id].pos = revolve(afterApproach.pos, {around: center, radians: plan.numAllemandeRadians * progressFrac});
          draft.protos[id].facing = afterApproach.facing.rotateByRadians(plan.numAllemandeRadians * progressFrac);
          connectHands(draft, id, instr.handedness, instr.relationship, instr.handedness);
        }
      }
    });
  },
}
