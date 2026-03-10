import { z } from "zod";

import { BeatsSchema, ProtoIdSchema, RoleSchema } from "../../contraCore";
import { VectorSchema } from "../../geometry";
import { CalledDirectionSchema, CalledIdentifierSchema } from "../_base";

// ── Shared sub-schemas ──────────────────────────────────────────────────

const fieldsDisplaySchema = z.array(
  z.union([z.string(), z.object({ field: z.enum(["basis_x", "basis_y"]) })]),
);

const relStateSchema = z.object({
  relPos: VectorSchema,
  relFacing: z.number(),
});

// ── Basis vector types ──────────────────────────────────────────────────

/**
 * A concrete basis vector value: either a CalledDirection (resolves to a unit
 * vector in that direction) or a CalledIdentifier (resolves to the displacement
 * vector from the dancer to the identified person, scaling with distance).
 */
export const BasisVectorSpecSchema = z.enum([
  ...CalledDirectionSchema.options,
  ...CalledIdentifierSchema.options,
]);
export type BasisVectorSpec = z.infer<typeof BasisVectorSpecSchema>;

/**
 * A basis spec in a template: either a fixed CalledDirection/CalledIdentifier,
 * or a placeholder for the choreographer to fill in.
 */
export const BasisSpecSchema = z.enum([
  ...CalledDirectionSchema.options,
  ...CalledIdentifierSchema.options,
  "choreographer_specified_direction",
  "choreographer_specified_identifier",
]);
export type BasisSpec = z.infer<typeof BasisSpecSchema>;

export const TemplateBasisSchema = z.object({
  x: BasisSpecSchema,
  y: BasisSpecSchema,
  /** Default value for x when it's choreographer_specified_*. Also used during template authoring preview. */
  assumedX: BasisVectorSpecSchema.optional(),
  /** Default value for y when it's choreographer_specified_*. Also used during template authoring preview. */
  assumedY: BasisVectorSpecSchema.optional(),
});
export type TemplateBasis = z.infer<typeof TemplateBasisSchema>;

export const DEFAULT_TEMPLATE_BASIS: TemplateBasis = {
  x: "on_right",
  y: "in_front",
};

// ── LR template schema ─────────────────────────────────────────────────

export const LRInstructionTemplateSchema = z.object({
  name: z.string(),
  defaultBeats: z.number(),
  fieldsDisplay: fieldsDisplaySchema,
  basis: TemplateBasisSchema,
  keyframes: z.array(
    z.object({
      dur: BeatsSchema,
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
  basis: TemplateBasisSchema,
  keyframes: z.array(
    z.object({
      dur: BeatsSchema,
      states: z.record(ProtoIdSchema, relStateSchema),
    }),
  ),
});
export type LLRRInstructionTemplate = z.infer<
  typeof LLRRInstructionTemplateSchema
>;

// ── Choreographer-specified fields ───────────────────────────────────────

export const ChoreographerSpecifiedFieldsSchema = z.object({
  basisX: BasisVectorSpecSchema.optional(),
  basisY: BasisVectorSpecSchema.optional(),
});
export type ChoreographerSpecifiedFields = z.infer<
  typeof ChoreographerSpecifiedFieldsSchema
>;
