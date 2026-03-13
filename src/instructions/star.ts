import { z } from "zod";

import { HandSchema, type ProtoId } from "../contraCore";
import {
  makePreferHinted,
  preferCloser,
  preferOneInFront,
  preferRecent,
  type Tiebreaker,
} from "../formations";
import { getDir, revolve, TWO_PI } from "../geometry";
import { getSingleton, lerp, must } from "../utils";
import { avgPos, Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  getGroupOfFour,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { hold } from "./_segment";

export const StarInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("star"),
  direction: HandSchema,
  nPlaces: z.number().positive(),
  disambiguatingCid: CalledIdentifierSchema.optional(),
});
export type StarInstruction = z.infer<typeof StarInstructionSchema>;

function makeTiebreakers(
  instr: StarInstruction,
): [Tiebreaker, ...Tiebreaker[]] {
  return instr.disambiguatingCid
    ? [
        makePreferHinted(instr.disambiguatingCid),
        preferCloser,
        preferOneInFront,
        preferRecent,
      ]
    : [preferCloser, preferOneInFront, preferRecent];
}

export function planStar(
  instr: StarInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const facingRotation = ((instr.direction === "right" ? 1 : -1) * Math.PI) / 2;
  const insideHand = instr.direction;
  const orbitRadians =
    (instr.direction === "left" ? 1 : -1) * TWO_PI * (instr.nPlaces / 4);

  const tiebreakers = makeTiebreakers(instr);
  const group = getGroupOfFour(dancer, { by: tiebreakers });
  const center = avgPos(...group);
  const opposite = must(
    getSingleton(
      group.filter((d) => d.role === dancer.role && d.dir !== dancer.dir),
    ),
  );

  const startPos = dancer.pos;
  const startFacing = getDir({
    from: startPos,
    to: center,
  }).rotateByRadians(facingRotation);

  return [
    // Star setup: rotate facing 90°, connect inside hands with opposite
    {
      dur: 0,
      facing: () => startFacing,
      hands: () => hold([insideHand, opposite.id, insideHand]),
    },
    // Orbit
    {
      dur: instr.beats,
      position: (frac) => {
        const revolved = revolve(startPos, {
          around: center,
          radians: orbitRadians * frac,
        });
        const offset = revolved.subtract(center);
        const targetScale =
          Math.sqrt(2) / 2 / startPos.subtract(center).length();
        return center.add(offset.multiply(lerp(1, targetScale, frac)));
      },
      facing: (frac) => startFacing.rotateByRadians(orbitRadians * frac),
    },
  ];
}

export function starAnimator(
  instr: StarInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planStar(instr, dancer));
}
