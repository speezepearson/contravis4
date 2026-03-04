import { z } from "zod";

import { HandSchema } from "../contraCore";
import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";
import type { InstructionAnimator } from "./_segment";
import { allemandeSegments } from "./allemande";

export const ShoulderRoundInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("shoulder_round"),
  cid: CalledIdentifierSchema,
  handedness: HandSchema,
  rotations: z.number(),
});
export type ShoulderRoundInstruction = z.infer<
  typeof ShoulderRoundInstructionSchema
>;

export const shoulderRoundSegments: InstructionAnimator<
  ShoulderRoundInstruction
> = (instr, init, who) => {
  const segments = allemandeSegments(
    { ...instr, type: "allemande" },
    init,
    who,
  );
  return segments.map(({ hands: _hands, ...rest }) => rest);
};
