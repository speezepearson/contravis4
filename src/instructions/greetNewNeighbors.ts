import { z } from "zod";

import { must } from "../utils";
import {
  instructionBaseSchemaFields,
  NonLabelCalledIdentifierSchema,
  resolveCalledIdentifier,
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
    interactedWith: (id, segInit) => [must(resolveCalledIdentifier(id, instr.cid, segInit))],
  },
];
