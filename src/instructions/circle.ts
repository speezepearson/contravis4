import { Vector } from "vecti";
import { z } from "zod";

import { HandSchema, type ProtoId } from "../contraCore";
import {
  getGroupOfFour,
  makePreferHinted,
  preferCloser,
  preferOneInFront,
  preferRecent,
  type Tiebreaker,
} from "../formations";
import { revolve, TWO_PI } from "../geometry";
import { lerp } from "../utils";
import { avgPos, Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
  resolveRing,
} from "./_base";
import { animatePlans } from "./_plan";
import { type InstructionAnimator, rotateFacingBy } from "./_segment";
import { computeRingFinalState, makeRingSegment } from "./takeHandsInRings";

export const CircleInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("circle"),
  direction: HandSchema,
  nPlaces: z.number().positive(),
  disambiguatingCid: CalledIdentifierSchema.optional(),
});
export type CircleInstruction = z.infer<typeof CircleInstructionSchema>;

export const circleSegments: InstructionAnimator<CircleInstruction> = (
  instr,
  init,
) => {
  const ringSegment = makeRingSegment(init, instr.disambiguatingCid);

  // CW if direction=left, CCW if direction=right
  const orbitRadians =
    (instr.direction === "right" ? 1 : -1) * TWO_PI * (instr.nPlaces / 4);

  return [
    ringSegment,
    {
      dur: instr.beats,
      position: (dancer, frac) => {
        const center = avgPos(...resolveRing(dancer));
        const revolved = revolve(dancer.pos, {
          around: center,
          radians: orbitRadians * frac,
        });
        const offset = revolved.subtract(center);
        const targetScale =
          Math.sqrt(2) / 2 / dancer.pos.subtract(center).length();
        return center.add(offset.multiply(lerp(1, targetScale, frac)));
      },
      facing: rotateFacingBy(() => orbitRadians),
    },
  ];
};

export function circleAnimator(
  instr: CircleInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const postRingState = computeRingFinalState(init, instr.disambiguatingCid);

  // CW if direction=left, CCW if direction=right
  const orbitRadians =
    (instr.direction === "right" ? 1 : -1) * TWO_PI * (instr.nPlaces / 4);

  // Use same tiebreaker logic as makeRingSegment for interactedWith
  const tiebreakers: [Tiebreaker, ...Tiebreaker[]] = instr.disambiguatingCid
    ? [
        makePreferHinted(instr.disambiguatingCid),
        preferCloser,
        preferOneInFront,
        preferRecent,
      ]
    : [preferCloser, preferOneInFront, preferRecent];

  return animatePlans(init, who, (dancer) => {
    const postRingDancer = Dancer.get(dancer.protoId, postRingState);
    const ring = resolveRing(postRingDancer);
    const center = avgPos(...ring);
    const initRadius = postRingDancer.pos.subtract(center).length();
    const targetScale = Math.sqrt(2) / 2 / initRadius;
    const initFacingAngle = Math.atan2(
      postRingDancer.facing.y,
      postRingDancer.facing.x,
    );

    // Match segment version: use getGroupOfFour for interactedWith ordering
    const group = getGroupOfFour(dancer, { by: tiebreakers });

    return [
      {
        dur: 0,
        facing: () => postRingState[dancer.protoId].facing,
        hands: () => postRingState[dancer.protoId].hands,
        interactedWith: () => group.map((d) => d.id),
      },
      {
        dur: instr.beats,
        position: (frac: number) => {
          const revolved = revolve(postRingDancer.pos, {
            around: center,
            radians: orbitRadians * frac,
          });
          const offset = revolved.subtract(center);
          return center.add(offset.multiply(lerp(1, targetScale, frac)));
        },
        facing: (frac: number) => {
          const angle = initFacingAngle + orbitRadians * frac;
          return new Vector(Math.cos(angle), Math.sin(angle));
        },
      },
    ];
  });
}
