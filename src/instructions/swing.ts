import { z } from "zod";

import { ALL_PROTO_IDS, type Beats, isLark, type ProtoId } from "../contraCore";
import {
  ccwRadsBetween,
  getDir,
  lerpFacing,
  revolve,
  TWO_PI,
} from "../geometry";
import { avgPos, lerpVectors, must } from "../utils";
import {
  buildProtoRecord,
  getDancerState,
  type WorldState,
} from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  getCardinalBearing,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import {
  disconnect,
  holdByRole,
  type Segment,
  type SegmentAnimator,
} from "./_segment";

export const SwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("swing"),
  cid: CalledIdentifierSchema,
  endFacing: CardinalDirectionSchema,
});
export type SwingInstruction = z.infer<typeof SwingInstructionSchema>;

const DISENGAGE_BEATS = 1.5;
const FINAL_SEPARATION = 1;
const ORBIT_RADIUS = 0.2;
const APPROX_BEATS_PER_SWING_ROTATION = 4;

/**
 * Choose approachBeats so the linear approach speed matches the orbit speed.
 *
 * Linear approach speed = approachDistance / approachBeats (constant).
 * Orbit speed = ORBIT_RADIUS * |swingRadians| / swingBeats.
 * Setting equal (with swingBeats = availableBeats - approachBeats):
 *   approachBeats = approachDist * available / (ORBIT_RADIUS * |swingRad| + approachDist)
 */
export function swingApproachBeatsForSpeedMatch(
  approachDistance: number,
  availableBeats: Beats,
  swingRadians: number,
): Beats {
  const orbitFactor = ORBIT_RADIUS * Math.abs(swingRadians);
  if (approachDistance + orbitFactor === 0) return 0;
  return (approachDistance * availableBeats) / (orbitFactor + approachDistance);
}

export function makeSwingSegments(
  instr: SwingInstruction,
  init: WorldState,
  _who: Set<ProtoId>,
): Segment[] {
  const pairs = buildProtoRecord((id) => {
    const me = getDancerState(id, init);
    const themId = must(resolveCalledIdentifier(id, instr.cid, init));
    const them = getDancerState(themId, init);
    const center = avgPos(me.pos, them.pos);
    return { me, themId, them, center };
  });

  const plans = buildProtoRecord((id) => {
    const { me, center } = pairs[id];
    const finalFacing = getCardinalBearing(instr.endFacing, center);

    const final = {
      facing: finalFacing,
      pos: center.add(
        finalFacing
          .multiply(FINAL_SEPARATION / 2)
          .rotateByDegrees(90 * (isLark(id) ? 1 : -1)),
      ),
    };

    const postApproach = {
      pos: center.add(
        getDir({ from: center, to: me.pos }).multiply(ORBIT_RADIUS),
      ),
      facing: getDir({ from: me.pos, to: center }),
    };

    const numSwingRadians =
      -TWO_PI * Math.floor(instr.beats / APPROX_BEATS_PER_SWING_ROTATION) +
      ccwRadsBetween(
        isLark(id) ? postApproach.facing : postApproach.facing.multiply(-1),
        finalFacing,
      );

    const postSwing = {
      pos: revolve(postApproach.pos, {
        around: center,
        radians: numSwingRadians,
      }),
      facing: postApproach.facing.rotateByRadians(numSwingRadians),
    };

    return {
      final,
      center,
      postApproach,
      postSwing,
      numSwingRadians,
    };
  });

  let totalApproachDist = 0;
  let totalSwingRadians = 0;
  for (const id of ALL_PROTO_IDS) {
    totalApproachDist += pairs[id].me.pos
      .subtract(plans[id].postApproach.pos)
      .length();
    totalSwingRadians += Math.abs(plans[id].numSwingRadians);
  }
  const avgApproachDist = totalApproachDist / ALL_PROTO_IDS.length;
  const avgSwingRadians = totalSwingRadians / ALL_PROTO_IDS.length;
  const approachBeats = swingApproachBeatsForSpeedMatch(
    avgApproachDist,
    instr.beats - DISENGAGE_BEATS,
    avgSwingRadians,
  );
  const swingBeats = instr.beats - approachBeats - DISENGAGE_BEATS;

  const swingHands = holdByRole({
    lark: ["right", instr.cid, "left"],
    robin: ["left", instr.cid, "right"],
  });

  return [
    {
      dur: approachBeats,
      position: (id, frac, segInit) =>
        lerpVectors(segInit[id].pos, plans[id].postApproach.pos, frac),
      facing: (id, frac, segInit) =>
        lerpFacing(segInit[id].facing, plans[id].postApproach.facing, frac),
      hands: disconnect(),
    },
    {
      dur: swingBeats,
      position: (id, frac) =>
        revolve(plans[id].postApproach.pos, {
          around: plans[id].center,
          radians: plans[id].numSwingRadians * frac,
        }),
      facing: (id, frac) =>
        plans[id].postApproach.facing.rotateByRadians(
          plans[id].numSwingRadians * frac,
        ),
      hands: swingHands,
    },
    {
      dur: DISENGAGE_BEATS,
      position: (id, frac) =>
        lerpVectors(plans[id].postSwing.pos, plans[id].final.pos, frac),
      facing: (id, frac) =>
        plans[id].postSwing.facing.rotateByRadians(
          ((ccwRadsBetween(plans[id].postSwing.facing, plans[id].final.facing) -
            TWO_PI) %
            TWO_PI) *
            frac,
        ),
      hands: swingHands,
    },
  ];
}

export const swingSegments =
  (instr: SwingInstruction): SegmentAnimator =>
  (init, who) =>
    makeSwingSegments(instr, init, who);
