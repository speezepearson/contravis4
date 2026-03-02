import { z } from 'zod';
import { RelationshipSchema, HandSchema, resolveRelationship, type Beats } from '../contraCore';
import { instructionBaseSchemaFields, type InstructionAnimator } from './_base';
import { buildProtoRecord, connectHands, getDancerState } from '../worldState';
import { produce } from 'immer';
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

export const allemandeAnimator: InstructionAnimator<AllemandeInstruction> = (init, who, instr) => {
  
  const rotationSign = instr.handedness === 'left' ? 1 : -1;
  const approachBeats = Math.min(1, instr.beats/4);
  const numAllemandeRadians = (2*Math.PI*instr.rotations - FRAC_ELLIPTICAL_ARC_TO_START) * rotationSign;
  const plans = buildProtoRecord((id) => {
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
  });

  return (t) => produce(init, (draft) => {
    draft.beat += t;
    if (t < approachBeats) {
      const progressFrac = t / approachBeats;
      for (const id of who) {
        const {afterApproach, counterpartStart} = plans[id];
        draft.protos[id].pos = ellipsePosition(init.protos[id].pos, counterpartStart, ALLEMANDE_RADIUS * rotationSign, FRAC_ELLIPTICAL_ARC_TO_START * progressFrac);
        draft.protos[id].facing = lerpFacing(init.protos[id].facing, afterApproach.facing, progressFrac);
      }
    } else {
      const progressFrac = (t - approachBeats) / (instr.beats - approachBeats);
      for (const id of who) {
        const {afterApproach, center} = plans[id];
        draft.protos[id].pos = revolve(afterApproach.pos, {around: center, radians: numAllemandeRadians * progressFrac});
        draft.protos[id].facing = afterApproach.facing.rotateByRadians(numAllemandeRadians * progressFrac);
        connectHands(draft, id, instr.handedness, instr.relationship, instr.handedness);
      }
    }
  });
};
