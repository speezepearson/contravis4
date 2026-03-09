import { z } from "zod";

import { HandSchema } from "../contraCore";
import { revolve, TWO_PI } from "../geometry";
import { lerp } from "../utils";
import { avgPos } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveRing,
} from "./_base";
import { type InstructionAnimator, rotateFacingBy } from "./_segment";
import { makeRingSegment } from "./takeHandsInRings";

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
