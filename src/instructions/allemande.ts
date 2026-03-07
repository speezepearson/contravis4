import { z } from "zod";

import { type Beats, HandSchema, type ProtoId } from "../contraCore";
import { getDir, PI, TWO_PI } from "../geometry";
import { buildProtoRecord, Dancer } from "../worldState";
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
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const numAllemandeRadians =
    (TWO_PI * instr.rotations - APPROACH_ELLIPSE_RADIANS) * rotationSign;

  const matches = new Map(
    [...who].map((id) => [id, Dancer.get(id, init).resolveMatch(instr.cid)]),
  );
  const alreadyClose = buildProtoRecord((id) => {
    const me = Dancer.get(id, init);
    const match = matches.get(id);
    if (!match) return false;
    return me.pos.subtract(match.pos).length() < 1.2;
  });

  let totalDistance = 0;
  let count = 0;
  for (const [id, match] of matches) {
    const me = Dancer.get(id as ProtoId, init);
    totalDistance += me.pos.subtract(match.pos).length();
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
        const match = matches.get(dancer.protoId);
        if (!match) return dancer.facing;
        return getDir({
          from: dancer.pos,
          to: match.pos,
        });
      }),
      hands: (dancer) =>
        alreadyClose[dancer.protoId]
          ? hold([
              instr.handedness,
              matches.get(dancer.protoId)!.id,
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
              matches.get(dancer.protoId)!.id,
              instr.handedness,
            ]),
      interactedWith: (dancer) => [matches.get(dancer.protoId)!.id],
    },
  ] satisfies Segment[];
};
