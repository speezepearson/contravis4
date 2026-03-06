import { z } from "zod";

import { SettableLabelSchema } from "../contraCore";
import { must } from "../utils";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { type InstructionAnimator } from "./_segment";

export const RelabelInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("relabel"),
  beats: z.literal(0),
  label: SettableLabelSchema,
  cid: CalledIdentifierSchema,
});
export type RelabelInstruction = z.infer<typeof RelabelInstructionSchema>;

export const relabelSegments: InstructionAnimator<RelabelInstruction> = (
  instr,
) => [
  {
    dur: 0,
    labels: (id, _frac, segInit) => {
      const theirId = must(resolveCalledIdentifier(id, instr.cid, segInit));
      return [[instr.label, theirId]];
    },
  },
];
