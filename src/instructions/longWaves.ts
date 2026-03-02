import { z } from "zod";
import { instructionBaseSchemaFields } from "./_base";

export const LongWavesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("long_waves"),
});
export type LongWavesInstruction = z.infer<typeof LongWavesInstructionSchema>;
