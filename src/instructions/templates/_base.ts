import { z } from "zod";

import { BeatsSchema, ProtoIdSchema, RoleSchema } from "../../contraCore";
import { VectorSchema } from "../../geometry";
import { CalledIdentifierSchema } from "../_base";

// ── Shared sub-schemas ──────────────────────────────────────────────────

const fieldsDisplaySchema = z.array(
  z.union([z.string(), z.object({ field: z.literal("matcher") })]),
);

const matcherSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hardcoded"), cid: CalledIdentifierSchema }),
  z.object({ type: z.literal("choreographer_specified") }),
]);

const relStateSchema = z.object({
  relPos: VectorSchema,
  relFacing: z.number(),
});

// ── LR template schema ─────────────────────────────────────────────────

export const LRInstructionTemplateSchema = z.object({
  name: z.string(),
  defaultBeats: z.number(),
  fieldsDisplay: fieldsDisplaySchema,
  matcher: matcherSchema,
  keyframes: z.array(
    z.object({
      t: BeatsSchema,
      states: z.record(RoleSchema, relStateSchema),
    }),
  ),
});
export type LRInstructionTemplate = z.infer<typeof LRInstructionTemplateSchema>;

// ── LLRR template schema ────────────────────────────────────────────────

export const LLRRInstructionTemplateSchema = z.object({
  name: z.string(),
  defaultBeats: z.number(),
  fieldsDisplay: fieldsDisplaySchema,
  matcher: matcherSchema,
  keyframes: z.array(
    z.object({
      t: BeatsSchema,
      states: z.record(ProtoIdSchema, relStateSchema),
    }),
  ),
});
export type LLRRInstructionTemplate = z.infer<
  typeof LLRRInstructionTemplateSchema
>;

// ── Choreographer-specified fields ───────────────────────────────────────

export const ChoreographerSpecifiedLRInstructionFieldsSchema = z.object({
  matcher: CalledIdentifierSchema.optional(),
});
export type ChoreographerSpecifiedLRInstructionFields = z.infer<
  typeof ChoreographerSpecifiedLRInstructionFieldsSchema
>;
