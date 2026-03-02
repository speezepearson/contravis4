import { z } from "zod";

import { instructionBaseSchemaFields } from "./_base";

export const TurnAsACoupleInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("turn_as_a_couple"),
});
export type TurnAsACoupleInstruction = z.infer<
  typeof TurnAsACoupleInstructionSchema
>;
