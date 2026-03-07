import { z } from "zod";

import { type Beats, HandSchema, type ProtoId } from "../contraCore";
import { getDir, PI, TWO_PI } from "../geometry";
import { buildProtoRecord, Dancer } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatch,
} from "./_base";
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
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const numAllemandeRadians =
    (TWO_PI * instr.rotations - APPROACH_ELLIPSE_RADIANS) * rotationSign;

  const matches = new Map(
    [...who].map((id) => [id, resolveMatch(Dancer.get(id, init), instr.cid)]),
  );
  const alreadyClose = buildProtoRecord((id) => {
    const me = Dancer.get(id, init);
    const matchId = matches.get(id);
    if (!matchId) return false;
    const them = Dancer.get(matchId, init);
    return me.pos.subtract(them.pos).length() < 1.2;
  });

  let totalDistance = 0;
  let count = 0;
  for (const [id, matchId] of matches) {
    const me = Dancer.get(id as ProtoId, init);
    const them = Dancer.get(matchId, init);
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
      facing: lerpFacingTo((dancer) => {
        const matchId = matches.get(dancer.protoId);
        if (!matchId) return dancer.facing;
        return getDir({
          from: dancer.pos,
          to: Dancer.get(matchId, dancer.state).pos,
        });
      }),
      hands: (dancer) =>
        alreadyClose[dancer.protoId]
          ? hold([
              instr.handedness,
              matches.get(dancer.protoId)!,
              instr.handedness,
            ])
          : {},
    },
    {
      dur: circlingBeats,
      position: orbit(matches, { radians: numAllemandeRadians }, who),
      facing: rotateFacingBy(() => numAllemandeRadians),
      hands: (dancer) =>
        !matches.has(dancer.protoId)
          ? {}
          : hold([
              instr.handedness,
              matches.get(dancer.protoId)!,
              instr.handedness,
            ]),
      interactedWith: (dancer) => [matches.get(dancer.protoId)!],
    },
  ] satisfies Segment[];
};
