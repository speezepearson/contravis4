import { z } from "zod";

import { HandSchema } from "../contraCore";
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
import { avgPos, Dancer } from "../worldState";
import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";
import { type InstructionAnimator, rotateFacingBy } from "./_segment";

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

export const singleFilePromenadeSegments: InstructionAnimator<
  SingleFilePromenadeInstruction
> = (instr, init) => {
  const orig = (d: Dancer) => d.at(init);
  const facingRotation = ((instr.direction === "right" ? 1 : -1) * Math.PI) / 2;

  const tiebreakers: [Tiebreaker, ...Tiebreaker[]] = instr.disambiguatingCid
    ? [
        makePreferHinted(instr.disambiguatingCid),
        preferCloser,
        preferOneInFront,
        preferRecent,
      ]
    : [preferCloser, preferOneInFront, preferRecent];
  const getInitGroup = (dancer: Dancer) =>
    getGroupOfFour(orig(dancer), { by: tiebreakers });

  const getCenter = (dancer: Dancer) => avgPos(...getInitGroup(dancer));

  // CW if direction=left, CCW if direction=right (same as circle/star)
  const orbitRadians =
    (instr.direction === "left" ? 1 : -1) * TWO_PI * (instr.nPlaces / 4);

  return [
    {
      dur: 0,
      facing: (dancer) =>
        getDir({ from: dancer.pos, to: getCenter(dancer) }).rotateByRadians(
          facingRotation,
        ),
      hands: () => ({}),
    },
    // Orbit (same as star/circle)
    {
      dur: instr.beats,
      position: (dancer, frac) => {
        const center = getCenter(dancer);
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
