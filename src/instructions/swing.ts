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
import {
  getSide,
  lerpVectors,
  smallestCrossDyToMakeAlignByMultOfTwo,
} from "../utils";
import {
  avgPos,
  buildProtoRecord,
  getDancerState,
  type WorldState,
} from "../worldState";
import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  instructionBaseSchemaFields,
  resolveCardinalDirection,
  resolveMatches,
} from "./_base";
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
  { preferDriftOnWest }: { preferDriftOnWest?: "up" | "down" } = {},
): Segment[] {
  const matches = resolveMatches(instr.cid, init);
  const centers = buildProtoRecord((id) => avgPos(init, id, matches[id]));

  const plans = buildProtoRecord((id) => {
    const me = getDancerState(id, init);
    const center = centers[id];
    const finalFacing = resolveCardinalDirection(instr.endFacing, center);

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
    totalApproachDist += getDancerState(id, init)
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

  const swingHands: HandsFn = (id) =>
    hold(
      isLark(id)
        ? ["right", matches[id], "left"]
        : ["left", matches[id], "right"],
    );

  const segments: Segment[] = [
    {
      dur: approachBeats,
      position: (id, frac, segInit) =>
        lerpVectors(segInit[id].pos, plans[id].postApproach.pos, frac),
      facing: (id, frac, segInit) =>
        lerpFacing(segInit[id].facing, plans[id].postApproach.facing, frac),
      hands: () => ({}),
      interactedWith: (id) => [matches[id]],
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
          (ccwRadsBetween(plans[id].postSwing.facing, plans[id].final.facing) -
            (isLark(id) ? 0 : TWO_PI)) *
            frac,
        ),
      hands: swingHands,
    },
  ];

  switch (instr.endFacing) {
    case "across":
    case "out": {
      // Empirically, ~every "swing, end facing across/out" instruction I've heard
      // has had *everybody* swinging, and ending with every pair facing across to another pair.
      const westSwingers = ALL_PROTO_IDS.filter(
        (id) => getSide(plans[id].center) === "west",
      );
      const eastSwingers = ALL_PROTO_IDS.filter(
        (id) => getSide(plans[id].center) === "east",
      );
      if (westSwingers.length !== eastSwingers.length) {
        throw new Error(
          `[swing end facing across/out] expected 2 dancers on each side of the set, but got [${westSwingers}] vs [${eastSwingers}]`,
        );
      }
      const westCoM = avgPos(init, ...westSwingers);
      const eastCoM = avgPos(init, ...eastSwingers);
      // Every pair's CoM should end up across the set from another pair's CoM.
      // We want to choose a dy such that (westCoM.y+dy) and (eastCoM.y-dy) differ by a multiple of 2.
      const dy = (() => {
        try {
          return smallestCrossDyToMakeAlignByMultOfTwo(westCoM.y, eastCoM.y, {
            errMsg: `[swing end facing across/out] isn't sure how to nudge the swings so that couples end up across from each other`,
          });
        } catch (e) {
          if (!preferDriftOnWest) throw e;
          const fudge = preferDriftOnWest === "up" ? 0.2 : -0.2;
          return (
            smallestCrossDyToMakeAlignByMultOfTwo(
              westCoM.y + fudge,
              eastCoM.y - fudge,
              {
                errMsg: `[swing end facing across/out] isn't sure how to nudge the swings so that couples end up across from each other`,
              },
            ) + fudge
          );
        }
      })();

      const drifts = buildProtoRecord((id) => {
        const center = centers[id];
        const finalCenter = new Vector(
          { east: 0.5, west: -0.5 }[getSide(center)],
          center.y + dy * (westSwingers.includes(id) ? 1 : -1),
        );
        return finalCenter.subtract(center);
      });
      return addPositionDrift(segments, (id, globalFrac) =>
        drifts[id].multiply(globalFrac),
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
