import { z } from "zod";

import { must } from "../utils";
import { instructionBaseSchemaFields, PersonInDirectionSchema } from "./_base";
import { type InstructionAnimator, type Segment } from "./_segment";

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
> = (instr): Segment[] => [
  {
    dur: 0,
    labels: (dancer) => [['neighbor', must(dancer.resolveCalledIdentifier(instr.cid)?.id, [
      {dancerId: dancer.id},
      ' has no ',
      {cid: instr.cid},
      ' to mark as their new neighbor'
    ])]],
    interactedWith: (dancer) => [
      must(dancer.resolveCalledIdentifier(instr.cid)).id,
    ],
  },
];
