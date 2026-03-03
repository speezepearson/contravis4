import { z } from "zod";

import {
  FoilRelationshipSchema,
  isLark,
  type ProtoId,
  resolveRelationship,
} from "../contraCore";
import {
  ccwRadsBetween,
  getDir,
  lerpFacing,
  revolve,
  TWO_PI,
} from "../geometry";
import { avgPos, lerpVectors } from "../utils";
import {
  buildProtoRecord,
  getDancerState,
  type WorldState,
} from "../worldState";
import {
  type Animator,
  CardinalDirectionSchema,
  getCardinalBearing,
  instructionBaseSchemaFields,
} from "./_base";
import {
  disconnect,
  holdByRole,
  makeAnimation,
  type Segment,
} from "./_segment";

export const SwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("swing"),
  relationship: FoilRelationshipSchema,
  endFacing: CardinalDirectionSchema,
});
export type SwingInstruction = z.infer<typeof SwingInstructionSchema>;

const APPROACH_BEATS = 1;
const DISENGAGE_BEATS = 1.5;
const FINAL_SEPARATION = 1;
const ORBIT_RADIUS = 0.2;
const APPROX_BEATS_PER_SWING_ROTATION = 4;

export function makeSwingSegments(
  instr: SwingInstruction,
  init: WorldState,
  who: Set<ProtoId>,
): Segment[] {
  const swingBeats = instr.beats - APPROACH_BEATS - DISENGAGE_BEATS;

  const pairs = buildProtoRecord((id) => {
    const me = getDancerState(id, init);
    const themId = resolveRelationship(id, instr.relationship);
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

  const swingHands = holdByRole({
    lark: ["right", instr.relationship, "left"],
    robin: ["left", instr.relationship, "right"],
  });

  return [
    {
      dur: APPROACH_BEATS,
      position: (id, frac, segInit) =>
        lerpVectors(segInit[id].pos, plans[id].postApproach.pos, frac),
      facing: (id, frac, segInit) =>
        lerpFacing(
          segInit[id].facing,
          plans[id].postApproach.facing,
          frac,
        ),
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
          ((ccwRadsBetween(
            plans[id].postSwing.facing,
            plans[id].final.facing,
          ) -
            TWO_PI) %
            TWO_PI) *
            frac,
        ),
      hands: swingHands,
    },
  ];
}

export const swingAnimator =
  (instr: SwingInstruction): Animator =>
  (init, who) =>
    makeAnimation(init, who, makeSwingSegments(instr, init, who));
