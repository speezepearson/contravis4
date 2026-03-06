import { z } from "zod";

import { ShadowLabelSchema } from "../labels";
import { must } from "../utils";
import {
  instructionBaseSchemaFields,
  NonLabelCalledIdentifierSchema,
  resolveCalledIdentifier,
} from "./_base";
import { type InstructionAnimator } from "./_segment";

export const GreetShadowInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("greet_shadow"),
  beats: z.literal(0),
  label: ShadowLabelSchema,
  cid: NonLabelCalledIdentifierSchema,
});
export type GreetShadowInstruction = z.infer<
  typeof GreetShadowInstructionSchema
>;

export const greetShadowSegments: InstructionAnimator<
  GreetShadowInstruction
> = (instr) => [
  {
    dur: 0,
    labels: (id, _frac, segInit) => {
      const theirId = must(resolveCalledIdentifier(id, instr.cid, segInit));
      return [[instr.label, theirId]];
    },
  },
];
