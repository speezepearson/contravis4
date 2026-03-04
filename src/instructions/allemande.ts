import { z } from "zod";

import { type Beats, HandSchema, type ProtoId } from "../contraCore";
import { getDir, PI, TWO_PI } from "../geometry";
import { buildProtoRecord, getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatches,
} from "./_base";
import {
  arc,
  hold,
  lerpFacingTo,
  orbit,
  rotateFacingBy,
  type Segment,
  type SegmentAnimator,
} from "./_segment";

export const AllemandeInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("allemande"),
  cid: CalledIdentifierSchema,
  handedness: HandSchema,
  rotations: z.number(),
});
export type AllemandeInstruction = z.infer<typeof AllemandeInstructionSchema>;

const ALLEMANDE_RADIUS = 0.25;
const APPROACH_ELLIPSE_RADIANS = PI / 2;

/**
 * Choose approachBeats so the dancer's speed at the end of the elliptical
 * approach roughly matches their speed during the circular orbit.
 *
 * At the end of the approach, instantaneous speed = (distance/2) * (PI/2) / approachBeats.
 * During the orbit, speed = ALLEMANDE_RADIUS * |orbitRadians| / circlingBeats.
 * Setting equal and solving (with circlingBeats = totalBeats - approachBeats):
 *   approachBeats = approachFactor * totalBeats / (orbitFactor + approachFactor)
 */
export function approachBeatsForSpeedMatch(
  distance: number,
  totalBeats: Beats,
  orbitRadians: number,
): Beats {
  const approachFactor = distance * (PI / 4);
  const orbitFactor = ALLEMANDE_RADIUS * Math.abs(orbitRadians);
  if (approachFactor + orbitFactor === 0) return 0;
  return (approachFactor * totalBeats) / (orbitFactor + approachFactor);
}

export const allemandeSegments = (
  instr: AllemandeInstruction,
): SegmentAnimator => {
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const numAllemandeRadians =
    (TWO_PI * instr.rotations - APPROACH_ELLIPSE_RADIANS) * rotationSign;

  return (init) => {
    const matches = resolveMatches(instr.cid, init);
    const alreadyClose = buildProtoRecord((id) => {
      const me = getDancerState(id, init);
      const them = getDancerState(matches[id], init);
      return me.pos.subtract(them.pos).length() < 1;
    });

    let totalDistance = 0;
    let count = 0;
    for (const [id, matchId] of Object.entries(matches)) {
      const me = getDancerState(id as ProtoId, init);
      const them = getDancerState(matchId, init);
      totalDistance += me.pos.subtract(them.pos).length();
      count++;
    }
    const avgDistance = totalDistance / count;
    const approachBeats = approachBeatsForSpeedMatch(
      avgDistance,
      instr.beats,
      numAllemandeRadians,
    );
    const circlingBeats = instr.beats - approachBeats;

    return [
      {
        dur: approachBeats,
        position: arc(instr.cid, {
          semiMinor: -ALLEMANDE_RADIUS * rotationSign,
          phi: APPROACH_ELLIPSE_RADIANS,
        }),
        facing: lerpFacingTo((id, segInit) => {
          return getDir({
            from: segInit[id].pos,
            to: getDancerState(matches[id], segInit).pos,
          });
        }),
        hands: (id) =>
          alreadyClose[id]
            ? hold([instr.handedness, matches[id], instr.handedness])
            : {},
      },
      {
        dur: circlingBeats,
        position: orbit(matches, { radians: numAllemandeRadians }),
        facing: rotateFacingBy(() => numAllemandeRadians),
        hands: (id) => hold([instr.handedness, matches[id], instr.handedness]),
      },
    ] satisfies Segment[];
  };
};
