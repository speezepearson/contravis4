import { z } from "zod";

import { HandSchema } from "../contraCore";
import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";

export const ShoulderRoundInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("shoulder_round"),
  cid: CalledIdentifierSchema,
  handedness: HandSchema,
  endFacing: z.enum([
    "larks_up_robins_down",
    "larks_down_robins_up",
    "larks_across_robins_out",
    "larks_out_robins_across",
  ]),
});
export type ShoulderRoundInstruction = z.infer<
  typeof ShoulderRoundInstructionSchema
>;
