import { z } from "zod";

import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";

export const MadRobinInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("mad_robin"),
  cid: CalledIdentifierSchema,
  dir: z.enum(["larks_in_middle", "robins_in_middle"]),
  rotations: z.number(),
});
export type MadRobinInstruction = z.infer<typeof MadRobinInstructionSchema>;
