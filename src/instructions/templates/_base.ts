import { z } from "zod";

import { BeatsSchema, RoleSchema } from "../../contraCore";
import { VectorSchema } from "../../geometry";
import { CalledIdentifierSchema } from "../_base";

// ── Template schema ──────────────────────────────────────────────────────

export const LRInstructionTemplateSchema = z.object({
  name: z.string(),
  defaultBeats: z.number(),
  fieldsDisplay: z.array(
    z.union([z.string(), z.object({ field: z.literal("matcher") })]),
  ),
  matcher: z.discriminatedUnion("type", [
    z.object({ type: z.literal("hardcoded"), cid: CalledIdentifierSchema }),
    z.object({ type: z.literal("choreographer_specified") }),
  ]),
  keyframes: z.array(
    z.object({
      t: BeatsSchema,
      states: z.record(
        RoleSchema,
        z.object({ relPos: VectorSchema, relFacing: z.number() }),
      ),
    }),
  ),
});
export type LRInstructionTemplate = z.infer<typeof LRInstructionTemplateSchema>;

// ── Choreographer-specified fields ───────────────────────────────────────

export const ChoreographerSpecifiedLRInstructionFieldsSchema = z.object({
  matcher: CalledIdentifierSchema.optional(),
});
export type ChoreographerSpecifiedLRInstructionFields = z.infer<
  typeof ChoreographerSpecifiedLRInstructionFieldsSchema
>;
