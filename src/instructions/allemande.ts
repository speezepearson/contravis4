import _ from "lodash";
import { z } from "zod";

import { type Beats, HandSchema } from "../contraCore";
import { getDir, PI, TWO_PI } from "../geometry";
import { avgPos, Dancer } from "../worldState";
import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";
import {
  arc,
  hold,
  type InstructionAnimator,
  lerpFacingTo,
  orbit,
  rotateFacingBy,
  type Segment,
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

export const allemandeSegments: InstructionAnimator<AllemandeInstruction> = (
  instr,
  init,
  who,
) => {
  const orig = (d: Dancer) => d.at(init);
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const numAllemandeRadians =
    (TWO_PI * instr.rotations - APPROACH_ELLIPSE_RADIANS) * rotationSign;

  const getMatch = _.memoize((d: Dancer) => {
    return orig(d).resolveMatch(instr.cid);
  });

  const avgDistance = (() => {
    let totalDistance = 0;
    let count = 0;
    for (const id of who) {
      const dancer = Dancer.get(id, init);
      totalDistance += dancer.pos.subtract(getMatch(dancer).pos).length();
      count++;
    }
    return totalDistance / count;
  })();
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
      facing: lerpFacingTo((dancer) => {
        const match = getMatch(dancer);
        if (!match) return dancer.facing;
        return getDir({
          from: orig(dancer).pos,
          to: orig(match).pos,
        });
      }),
      hands: (dancer) =>
        orig(dancer).pos.subtract(getMatch(dancer).pos).length() < 1.2
          ? hold([instr.handedness, getMatch(dancer).id, instr.handedness])
          : {},
    },
    {
      dur: circlingBeats,
      position: orbit(
        (d) => avgPos(orig(d), orig(getMatch(d))),
        { radians: numAllemandeRadians },
        who,
      ),
      facing: rotateFacingBy(() => numAllemandeRadians),
      hands: (dancer) =>
        hold([instr.handedness, getMatch(dancer).id, instr.handedness]),
      interactedWith: (dancer) => [getMatch(dancer).id],
    },
  ] satisfies Segment[];
};
