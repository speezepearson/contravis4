import { Vector } from "vecti";
import { z } from "zod";

import { ALL_PROTO_IDS, type Beats, isLark, type ProtoId } from "../contraCore";
import {
  ccwRadsBetween,
  getDir,
  lerpFacing,
  revolve,
  TWO_PI,
} from "../geometry";
import { getSide, lerpVectors, must } from "../utils";
import {
  avgPos,
  buildProtoRecord,
  Dancer,
  type WorldState,
} from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  instructionBaseSchemaFields,
  resolveCardinalDirection,
  resolveMatches,
} from "./_base";
import { fudgeToAlignY } from "./_fudge";
import {
  addPositionDrift,
  type HandsFn,
  hold,
  type InstructionAnimator,
  type Segment,
} from "./_segment";

export const SwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("swing"),
  cid: CalledIdentifierSchema,
  endFacing: CardinalDirectionSchema,
});
export type SwingInstruction = z.infer<typeof SwingInstructionSchema>;

const DISENGAGE_BEATS = 1.5;
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
  _who: ReadonlySet<ProtoId>,
): Segment[] {
  const matches = resolveMatches(instr.cid, init);
  const centers = buildProtoRecord((id) => avgPos(init, id, matches[id].id));

  const plans = buildProtoRecord((id) => {
    const me = Dancer.get(id, init);
    const center = centers[id];
    const finalFacing = must(
      resolveCardinalDirection(instr.endFacing, center),
      [{ dancerId: id }, `unable to resolve end facing ${instr.endFacing}`],
    );

    const final = {
      facing: finalFacing,
      pos: center.add(
        finalFacing
          .multiply(
            { across: 1, out: 1, up: 0.5, down: 0.5 }[instr.endFacing] / 2,
          )
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
    totalApproachDist += Dancer.get(id, init)
      .pos.subtract(plans[id].postApproach.pos)
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

  const swingHands: HandsFn = (dancer) =>
    hold(
      isLark(dancer.protoId)
        ? ["right", matches[dancer.protoId].id, "left"]
        : ["left", matches[dancer.protoId].id, "right"],
    );

  const segments: Segment[] = [
    {
      dur: approachBeats,
      position: (dancer, frac) =>
        lerpVectors(dancer.pos, plans[dancer.protoId].postApproach.pos, frac),
      facing: (dancer, frac) =>
        lerpFacing(
          dancer.facing,
          plans[dancer.protoId].postApproach.facing,
          frac,
        ),
      hands: () => ({}),
      interactedWith: (dancer) => [matches[dancer.protoId].id],
    },
    {
      dur: swingBeats,
      position: (dancer, frac) =>
        revolve(plans[dancer.protoId].postApproach.pos, {
          around: plans[dancer.protoId].center,
          radians: plans[dancer.protoId].numSwingRadians * frac,
        }),
      facing: (dancer, frac) =>
        plans[dancer.protoId].postApproach.facing.rotateByRadians(
          plans[dancer.protoId].numSwingRadians * frac,
        ),
      hands: swingHands,
    },
    {
      dur: DISENGAGE_BEATS,
      position: (dancer, frac) =>
        lerpVectors(
          plans[dancer.protoId].postSwing.pos,
          plans[dancer.protoId].final.pos,
          frac,
        ),
      facing: (dancer, frac) => {
        let angle = ccwRadsBetween(
          plans[dancer.protoId].postSwing.facing,
          plans[dancer.protoId].final.facing,
        );
        // Robin unwinds CW from the swing; force the rotation CW.
        if (!isLark(dancer.protoId) && angle > 0) angle -= TWO_PI;
        return plans[dancer.protoId].postSwing.facing.rotateByRadians(
          angle * frac,
        );
      },
      hands: swingHands,
    },
  ];

  switch (instr.endFacing) {
    case "across":
    case "out": {
      // Snap x to exactly ±0.5 (centers of each side of the set).
      const xDrifts = buildProtoRecord((id) => {
        const center = centers[id];
        const side = must(getSide(center), [
          { dancerId: id },
          "too close to center, not sure which side is east or west",
        ]);
        return { east: 0.5, west: -0.5 }[side] - center.x;
      });
      const xSnapped = addPositionDrift(
        segments,
        (id, globalFrac) => new Vector(xDrifts[id] * globalFrac, 0),
      );
      // Nudge y so that opposite-role pairs end up directly across.
      return fudgeToAlignY(xSnapped, init, _who);
    }
  }

  return segments;
}

export const swingSegments: InstructionAnimator<SwingInstruction> = (
  instr,
  init,
  who,
) => makeSwingSegments(instr, init, who);
