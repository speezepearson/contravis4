import { z } from "zod";

import { type Beats, HandSchema, type ProtoId } from "../contraCore";
import {
  ellipsePosition,
  getDir,
  lerpFacing,
  PI,
  revolve,
  TWO_PI,
} from "../geometry";
import { avgPos, Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { hold } from "./_segment";

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

export function planAllemande(
  instr: AllemandeInstruction,
  dancer: Dancer,
  approachBeats: Beats,
): DancerSegment[] {
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const numAllemandeRadians =
    (TWO_PI * instr.rotations - APPROACH_ELLIPSE_RADIANS) * rotationSign;
  const circlingBeats = instr.beats - approachBeats;

  const match = dancer.resolveMatch(instr.cid);
  const startPos = dancer.pos;
  const matchPos = match.pos;
  const startFacing = dancer.facing;
  const center = avgPos(dancer, match);
  const distance = startPos.subtract(matchPos).length();

  const targetFacing = getDir({ from: startPos, to: matchPos });

  // Post-approach position: end of the elliptical arc
  const postApproachPos = ellipsePosition(
    startPos,
    matchPos,
    -ALLEMANDE_RADIUS * rotationSign,
    APPROACH_ELLIPSE_RADIANS,
  );
  const postApproachFacing = lerpFacing(startFacing, targetFacing, 1);

  return [
    {
      dur: approachBeats,
      position: (frac) =>
        ellipsePosition(
          startPos,
          matchPos,
          -ALLEMANDE_RADIUS * rotationSign,
          APPROACH_ELLIPSE_RADIANS * frac,
        ),
      facing: (frac) => lerpFacing(startFacing, targetFacing, frac),
      hands: () =>
        distance < 1.2
          ? hold([instr.handedness, match.id, instr.handedness])
          : {},
    },
    {
      dur: circlingBeats,
      position: (frac) =>
        revolve(postApproachPos, {
          around: center,
          radians: numAllemandeRadians * frac,
        }),
      facing: (frac) =>
        postApproachFacing.rotateByRadians(numAllemandeRadians * frac),
      hands: () => hold([instr.handedness, match.id, instr.handedness]),
      interactedWith: () => [match.id],
    },
  ];
}

export function allemandeAnimator(
  instr: AllemandeInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const rotationSign = instr.handedness === "left" ? 1 : -1;
  const numAllemandeRadians =
    (TWO_PI * instr.rotations - APPROACH_ELLIPSE_RADIANS) * rotationSign;

  // Compute average distance across all dancers for speed-matching
  let totalDistance = 0;
  let count = 0;
  for (const id of who) {
    const dancer = Dancer.get(id, init);
    const match = dancer.resolveMatch(instr.cid);
    totalDistance += dancer.pos.subtract(match.pos).length();
    count++;
  }
  const avgDistance = totalDistance / count;

  const approachBeats = approachBeatsForSpeedMatch(
    avgDistance,
    instr.beats,
    numAllemandeRadians,
  );

  return animatePlans(init, who, (dancer) =>
    planAllemande(instr, dancer, approachBeats),
  );
}
