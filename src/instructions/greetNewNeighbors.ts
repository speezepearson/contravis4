import { z } from "zod";

import { must } from "../utils";
import { instructionBaseSchemaFields, PersonInDirectionSchema } from "./_base";
import { type InstructionAnimator } from "./_segment";

export const GreetNewNeighborsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("greet_new_neighbors"),
  beats: z.literal(0),
  cid: PersonInDirectionSchema,
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
    interactedWith: (dancer) => [
      must(dancer.resolveCalledIdentifier(instr.cid)),
    ],
  },
];
