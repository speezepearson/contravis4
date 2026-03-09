import { z } from "zod";

import { HandSchema } from "../contraCore";
import { preferCloser, preferOneInFront, preferRecent } from "../formations";
import { getDir, revolve, TWO_PI } from "../geometry";
import { getSingleton, lerp, must } from "../utils";
import { avgPos, Dancer } from "../worldState";
import { getGroupOfFour, instructionBaseSchemaFields } from "./_base";
import { hold, type InstructionAnimator, rotateFacingBy } from "./_segment";

export const StarInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("star"),
  direction: HandSchema,
  nPlaces: z.number().positive(),
});
export type StarInstruction = z.infer<typeof StarInstructionSchema>;

export const starSegments: InstructionAnimator<StarInstruction> = (
  instr,
  init,
) => {
  const facingRotation = ((instr.direction === "right" ? 1 : -1) * Math.PI) / 2;

  const insideHand = instr.direction;

  // CW if direction=left, CCW if direction=right (same as circle)
  const orbitRadians =
    (instr.direction === "left" ? 1 : -1) * TWO_PI * (instr.nPlaces / 4);

  const getInitGroup = (dancer: Dancer) =>
    getGroupOfFour(dancer.at(init), {
      by: [preferCloser, preferOneInFront, preferRecent],
    });
  const opp = (dancer: Dancer) => {
    const group = getInitGroup(dancer);
    return must(
      getSingleton(
        group.filter((d) => d.role === dancer.role && d.dir !== dancer.dir),
      ),
    );
  };

  const getCenter = (dancer: Dancer) => avgPos(...getInitGroup(dancer));

  return [
    // Star setup: rotate facing 90°, connect inside hands with opposite
    {
      dur: 0,
      facing: (dancer) =>
        getDir({ from: dancer.pos, to: getCenter(dancer) }).rotateByRadians(
          facingRotation,
        ),
      hands: (dancer) => hold([insideHand, opp(dancer).id, insideHand]),
    },
    // Orbit (same as circle)
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
