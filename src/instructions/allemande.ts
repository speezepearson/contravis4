import { z } from "zod";

import { type Beats, HandSchema } from "../contraCore";
import { getDir, PI, TWO_PI } from "../geometry";
import { must } from "../utils";
import { connectHands, getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import {
  arc,
  lerpFacingTo,
  orbit,
  rotateFacingBy,
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

  return (init, who) => {
    let totalDistance = 0;
    let count = 0;
    const closeEnoughForHands = new Set<string>();
    for (const id of who) {
      const me = getDancerState(id, init);
      const themId = must(resolveCalledIdentifier(id, instr.cid, init));
      const them = getDancerState(themId, init);
      const dist = me.pos.subtract(them.pos).length();
      totalDistance += dist;
      count++;
      if (dist < 1) {
        closeEnoughForHands.add(id);
      }
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
          const them = must(resolveCalledIdentifier(id, instr.cid, segInit));
          return getDir({
            from: segInit[id].pos,
            to: getDancerState(them, segInit).pos,
          });
        }),
        hands: (id, _frac, draft) => {
          if (closeEnoughForHands.has(id)) {
            connectHands(
              draft,
              id,
              instr.handedness,
              must(resolveCalledIdentifier(id, instr.cid, draft)),
              instr.handedness,
            );
          }
        },
      },
      {
        dur: circlingBeats,
        position: orbit(instr.cid, { radians: numAllemandeRadians }),
        facing: rotateFacingBy(() => numAllemandeRadians),
        hands: (id, _frac, draft) => {
          connectHands(
            draft,
            id,
            instr.handedness,
            must(resolveCalledIdentifier(id, instr.cid, draft)),
            instr.handedness,
          );
        },
      },
    ];
  };
};
