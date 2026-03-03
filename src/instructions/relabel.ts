import { z } from "zod";

import { must } from "../utils";
import { BasicLabelSchema } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { type SegmentAnimator } from "./_segment";

export const RelabelInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("relabel"),
  beats: z.literal(0),
  label: BasicLabelSchema,
  cid: CalledIdentifierSchema,
});
export type RelabelInstruction = z.infer<typeof RelabelInstructionSchema>;

export const relabelSegments =
  (instr: RelabelInstruction): SegmentAnimator =>
  () => [
    {
      dur: 0,
      labels: (id, _frac, draft) => {
        const theirId = must(resolveCalledIdentifier(id, instr.cid, draft));
        draft[id].labels.set(instr.label, theirId);
      },
    },
  ];
