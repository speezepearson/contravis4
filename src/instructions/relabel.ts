import { z } from "zod";

import { BasicLabelSchema } from "../contraCore";
import { must } from "../utils";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { makeImmediateSegment, type SegmentAnimator } from "./_segment";

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
  (init) => [
    makeImmediateSegment(init, (id, draft) => {
      const theirId = must(resolveCalledIdentifier(id, instr.cid, init));
      draft[id].labels[instr.label] = theirId;
    }),
  ];
