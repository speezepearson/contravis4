import { z } from "zod";

import {
  instructionBaseSchemaFields,
  NonLabelCalledIdentifierSchema,
} from "./_base";
import { type InstructionAnimator } from "./_segment";

export const GreetNewNeighborsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("greet_new_neighbors"),
  beats: z.literal(0),
  cid: NonLabelCalledIdentifierSchema,
});
export type GreetNewNeighborsInstruction = z.infer<
  typeof GreetNewNeighborsInstructionSchema
>;

export const greetNewNeighborsSegments: InstructionAnimator<
  GreetNewNeighborsInstruction
> = (instr) => [
  {
    dur: 0,
    newNeighbors: instr.cid,
  },
];
