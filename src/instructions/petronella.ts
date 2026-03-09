import { z } from "zod";

import { ALL_PROTO_IDS } from "../contraCore";
import { ccwRadsBetween, getDir, TWO_PI } from "../geometry";
import { must } from "../utils";
import { avgPos, Dancer } from "../worldState";
import { instructionBaseSchemaFields, resolveRing } from "./_base";
import { type InstructionAnimator, linearTo, rotateFacingBy } from "./_segment";

export const PetronellaInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("petronella"),
});
export type PetronellaInstruction = z.infer<typeof PetronellaInstructionSchema>;

export const petronellaSegments: InstructionAnimator<PetronellaInstruction> = (
  instr,
  init,
  who,
) => {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`petronella instruction must target all dancers`);

  const getTarget = (dancer: Dancer) => {
    const { theirId } = must(dancer.hands["right"]);
    const targetPos = Dancer.get(theirId, init).pos;
    const targetFacing = getDir({
      from: targetPos,
      to: avgPos(...resolveRing(dancer)),
    });
    // Always rotate CW: if ccwRadsBetween gives positive, subtract 2PI
    const ccwAngle = ccwRadsBetween(dancer.facing, targetFacing);
    const cwAngle = ccwAngle > 0 ? ccwAngle - TWO_PI : ccwAngle;
    return { targetPos, cwAngle };
  };

  return [
    {
      dur: instr.beats,
      position: linearTo((dancer) => getTarget(dancer).targetPos),
      facing: rotateFacingBy((dancer) => getTarget(dancer).cwAngle),
      hands: () => ({}),
    },
  ];
};
