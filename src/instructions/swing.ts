import { z } from 'zod';
import { FoilRelationshipSchema, parseProtoId, resolveRelationship, type Beats, type ProtoId } from '../contraCore';
import { instructionBaseSchemaFields, type InstructionAnimator, RelativeDirectionSchema, resolveRelativeDirection, type ContraAnimation } from './_base';
import { produce } from 'immer';
import { getDancerState, connectHands, type WorldState, buildProtoRecord } from '../worldState';
import { lerpVectors } from '../utils';
import { ccwRadsBetween, getDir, lerpFacing, revolve } from '../geometry';
import type { Vector } from 'vecti';

export const SwingInstructionSchema = z.object({ ...instructionBaseSchemaFields, type: z.literal('swing'), relationship: FoilRelationshipSchema, endFacing: RelativeDirectionSchema });
export type SwingInstruction = z.infer<typeof SwingInstructionSchema>;

const APPROACH_BEATS = 1;
const DISENGAGE_BEATS = 1.5;
const FINAL_SEPARATION = 1;
const ORBIT_RADIUS = 0.2;
const APPROX_BEATS_PER_SWING_ROTATION = 4;

type Plan = {
  approachBeats: Beats;
  swingBeats: Beats;
  disengageBeats: Beats;
  perProto: Record<ProtoId, {
    final: {pos: Vector; facing: Vector};
    center: Vector;
    postApproach: {pos: Vector; facing: Vector};
    postSwing: {pos: Vector; facing: Vector};
    numSwingRadians: number;
  }>;
}

function makePlan(init: WorldState, instr: SwingInstruction): Plan {
  return {
    approachBeats: APPROACH_BEATS,
    swingBeats: instr.beats - APPROACH_BEATS - DISENGAGE_BEATS,
    disengageBeats: DISENGAGE_BEATS,
    perProto: buildProtoRecord((id) => {
      const isLark = parseProtoId(id).role === 'lark';
      const finalFacing = resolveRelativeDirection(instr.endFacing, getDancerState(id, init.protos), id, init.protos);

      const myPos = getDancerState(id, init.protos).pos;
      const theirPos = getDancerState(resolveRelationship(id, instr.relationship), init.protos).pos;
      const center = myPos.add(theirPos).divide(2);

      const final = {
        facing: finalFacing,
        pos: center.add(
          finalFacing.multiply(FINAL_SEPARATION / 2)
          .rotateByDegrees(90 * (isLark ? 1 : -1)))
      };

      const postApproach = {
        pos: center.add(getDir({from: center, to: myPos}).multiply(ORBIT_RADIUS)),
        facing: getDir({from: myPos, to: center}),
      }

      const numSwingRadians = -2*Math.PI*Math.floor(instr.beats / APPROX_BEATS_PER_SWING_ROTATION)
        + ccwRadsBetween(isLark ? postApproach.facing : postApproach.facing.multiply(-1), finalFacing);

      const postSwing = {
        pos: revolve(postApproach.pos, {around: center, radians: numSwingRadians}),
        facing: postApproach.facing.rotateByRadians(numSwingRadians),
      }

      return {
        final,
        center,
        postApproach,
        postSwing,
        numSwingRadians,
      };
    }),
  };
}

export const swingAnimator: InstructionAnimator<SwingInstruction> = {
  final(state: WorldState, who: Set<ProtoId>, instr: SwingInstruction): WorldState {
    const plan = makePlan(state, instr);
    return produce(state, (draft) => {
      draft.beat += instr.beats;
      for (const id of who) {
        draft.protos[id].pos = plan.perProto[id].final.pos;
        draft.protos[id].facing = plan.perProto[id].final.facing;
        connectHands(draft, id, parseProtoId(id).role === 'lark' ? 'right' : 'left', instr.relationship, parseProtoId(id).role === 'lark' ? 'left' : 'right');
      }
    });
  },

  animate(state: WorldState, who: Set<ProtoId>, instr: SwingInstruction): ContraAnimation {
    const plan = makePlan(state, instr);
    return (t: Beats) => produce(state, (draft) => {
      draft.beat += t;
      for (const id of who) {
        if (t < plan.approachBeats) {
          const progressFrac = t / plan.approachBeats;
          draft.protos[id].pos = lerpVectors(plan.perProto[id].postApproach.pos, plan.perProto[id].postSwing.pos, progressFrac);
          draft.protos[id].facing = lerpFacing(state.protos[id].facing, plan.perProto[id].postApproach.facing, progressFrac);
        } else if (t < instr.beats - plan.disengageBeats) {
          const progressFrac = (t - plan.approachBeats) / (plan.swingBeats);
          draft.protos[id].pos = revolve(plan.perProto[id].postApproach.pos, {around: plan.perProto[id].center, radians: plan.perProto[id].numSwingRadians * progressFrac});
          draft.protos[id].facing = plan.perProto[id].postApproach.facing.rotateByRadians(-plan.perProto[id].numSwingRadians * progressFrac);
        } else {
          const progressFrac = (t - (instr.beats - plan.disengageBeats)) / plan.disengageBeats;
          draft.protos[id].pos = lerpVectors(plan.perProto[id].postSwing.pos, plan.perProto[id].final.pos, progressFrac);
          draft.protos[id].facing = lerpFacing(plan.perProto[id].postSwing.facing, plan.perProto[id].final.facing, progressFrac);
        }
      }
    });
  },
}
