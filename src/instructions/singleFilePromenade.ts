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
import { getDir, revolve, TWO_PI } from "../geometry";
import { lerp } from "../utils";
import { avgPos, Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const SingleFilePromenadeInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("single_file_promenade"),
  direction: HandSchema,
  nPlaces: z.number().positive(),
  disambiguatingCid: CalledIdentifierSchema.optional(),
});
export type SingleFilePromenadeInstruction = z.infer<
  typeof SingleFilePromenadeInstructionSchema
>;

function makeTiebreakers(
  instr: SingleFilePromenadeInstruction,
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

export function planSingleFilePromenade(
  instr: SingleFilePromenadeInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const facingRotation = ((instr.direction === "right" ? 1 : -1) * Math.PI) / 2;
  const orbitRadians =
    (instr.direction === "left" ? 1 : -1) * TWO_PI * (instr.nPlaces / 4);

  const tiebreakers = makeTiebreakers(instr);
  const group = getGroupOfFour(dancer, { by: tiebreakers });
  const center = avgPos(...group);
  const startPos = dancer.pos;
  const startFacing = getDir({
    from: startPos,
    to: center,
  }).rotateByRadians(facingRotation);

  return [
    {
      dur: 0,
      facing: () => startFacing,
      hands: () => ({}),
    },
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

export function singleFilePromenadeAnimator(
  instr: SingleFilePromenadeInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) =>
    planSingleFilePromenade(instr, dancer),
  );
}
