import { z } from "zod";
import { instructionBaseSchemaFields } from "./_base";

export const LongLinesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("long_lines"),
});
export type LongLinesInstruction = z.infer<typeof LongLinesInstructionSchema>;
