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
import { avgPos, Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  instructionBaseSchemaFields,
  resolveCardinalDirection,
} from "./_base";
import { fudgeToAlignY, fudgeToSpaceEvenlyInY } from "./_fudge";
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
  who: ReadonlySet<ProtoId>,
): Segment[] {
  const orig = (d: Dancer) => d.at(init);
  const getMatch = (d: Dancer) => orig(d).resolveMatch(instr.cid);

  const getCenter = (d: Dancer) => avgPos(orig(d), getMatch(d));

  const getPlan = (d: Dancer) => {
    const me = orig(d);
    const center = getCenter(d);
    const finalFacing = must(
      resolveCardinalDirection(instr.endFacing, center),
      [{ dancerId: d.id }, `unable to resolve end facing ${instr.endFacing}`],
    );

    const final = {
      facing: finalFacing,
      pos: center.add(
        finalFacing
          .multiply(
            { across: 1, out: 1, up: 0.5, down: 0.5 }[instr.endFacing] / 2,
          )
          .rotateByDegrees(90 * (isLark(d.protoId) ? 1 : -1)),
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
        isLark(d.protoId)
          ? postApproach.facing
          : postApproach.facing.multiply(-1),
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
  };

  let totalApproachDist = 0;
  let totalSwingRadians = 0;
  for (const id of ALL_PROTO_IDS) {
    const plan = getPlan(Dancer.get(id, init));
    totalApproachDist += Dancer.get(id, init)
      .pos.subtract(plan.postApproach.pos)
      .length();
    totalSwingRadians += Math.abs(plan.numSwingRadians);
  }
  const avgApproachDist = totalApproachDist / ALL_PROTO_IDS.length;
  const avgSwingRadians = totalSwingRadians / ALL_PROTO_IDS.length;
  const approachBeats = swingApproachBeatsForSpeedMatch(
    avgApproachDist,
    instr.beats - DISENGAGE_BEATS,
    avgSwingRadians,
  );
  const swingBeats = instr.beats - approachBeats - DISENGAGE_BEATS;

  const swingHands: HandsFn = (dancer) => {
    const matchId = getMatch(dancer).id;
    return hold(
      isLark(dancer.protoId)
        ? ["right", matchId, "left"]
        : ["left", matchId, "right"],
    );
  };

  const segments: Segment[] = [
    {
      dur: approachBeats,
      position: (dancer, frac) =>
        lerpVectors(dancer.pos, getPlan(dancer).postApproach.pos, frac),
      facing: (dancer, frac) =>
        lerpFacing(dancer.facing, getPlan(dancer).postApproach.facing, frac),
      hands: () => ({}),
      interactedWith: (dancer) => [getMatch(dancer).id],
    },
    {
      dur: swingBeats,
      position: (dancer, frac) =>
        revolve(getPlan(dancer).postApproach.pos, {
          around: getPlan(dancer).center,
          radians: getPlan(dancer).numSwingRadians * frac,
        }),
      facing: (dancer, frac) =>
        getPlan(dancer).postApproach.facing.rotateByRadians(
          getPlan(dancer).numSwingRadians * frac,
        ),
      hands: swingHands,
    },
    {
      dur: DISENGAGE_BEATS,
      position: (dancer, frac) =>
        lerpVectors(
          getPlan(dancer).postSwing.pos,
          getPlan(dancer).final.pos,
          frac,
        ),
      facing: (dancer, frac) => {
        let angle = ccwRadsBetween(
          getPlan(dancer).postSwing.facing,
          getPlan(dancer).final.facing,
        );
        // Robin unwinds CW from the swing; force the rotation CW.
        if (!isLark(dancer.protoId) && angle > 0) angle -= TWO_PI;
        return getPlan(dancer).postSwing.facing.rotateByRadians(angle * frac);
      },
      hands: swingHands,
    },
  ];

  switch (instr.endFacing) {
    case "across":
    case "out": {
      // Snap x to exactly ±0.5 (centers of each side of the set).
      const getXDrift = (d: Dancer) => {
        const center = getCenter(d);
        const side = must(getSide(center), [
          { dancerId: d.id },
          "too close to center, not sure which side is east or west",
        ]);
        return { east: 0.5, west: -0.5 }[side] - center.x;
      };
      const xSnapped = addPositionDrift(
        segments,
        (id, globalFrac) =>
          new Vector(getXDrift(Dancer.get(id, init)) * globalFrac, 0),
      );
      // Nudge y so that opposite-role pairs end up directly across.
      return fudgeToAlignY(
        fudgeToSpaceEvenlyInY(xSnapped, init, who),
        init,
        who,
      );
    }
  }

  return segments;
}

export const swingSegments: InstructionAnimator<SwingInstruction> = (
  instr,
  init,
  who,
) => makeSwingSegments(instr, init, who);
