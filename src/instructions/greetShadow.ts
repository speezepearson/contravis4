import { z } from "zod";

import { ShadowLabelSchema } from "../labels";
import { must } from "../utils";
import { instructionBaseSchemaFields, PersonInDirectionSchema } from "./_base";
import { type InstructionAnimator, type Segment } from "./_segment";

export const GreetShadowInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("greet_shadow"),
  beats: z.literal(0),
  label: ShadowLabelSchema,
  cid: PersonInDirectionSchema,
});
export type GreetShadowInstruction = z.infer<
  typeof GreetShadowInstructionSchema
>;

export const greetShadowSegments: InstructionAnimator<
  GreetShadowInstruction
> = (instr): Segment[] => [
  {
    dur: 0,
    labels: (dancer, _frac) => {
      const them = must(dancer.resolveCalledIdentifier(instr.cid));
      return [[instr.label, them.id]];
    },
  },
];
