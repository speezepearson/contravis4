import { z } from "zod";

import { BeatsSchema, ProtoIdSchema, RoleSchema } from "../../contraCore";
import {
  ALL_BASE_CALLED_DIRECTIONS,
  type BaseCalledDirection,
  baseCalledDirectionFromKey,
  BaseCalledDirectionSchema,
  baseCalledDirectionToKey,
  pureDir,
} from "../../directions";
import { VectorSchema } from "../../geometry";
import {
  ALL_BASE_CALLED_IDENTIFIERS,
  type BaseCalledIdentifier,
  baseCalledIdentifierFromKey,
  BaseCalledIdentifierSchema,
  baseCalledIdentifierToKey,
  calledIdentifierFromKey,
  calledIdentifierToKey,
  PerRoleIdentifierVariantSchema,
} from "../../identifiers";

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
export const BasisVectorSpecSchema = z.discriminatedUnion("type", [
  ...BaseCalledDirectionSchema.options,
  ...BaseCalledIdentifierSchema.options,
  PerRoleIdentifierVariantSchema,
]);
export type BasisVectorSpec = z.infer<typeof BasisVectorSpecSchema>;

/**
 * A basis spec in a template: either a fixed CalledDirection/CalledIdentifier,
 * or a placeholder for the choreographer to fill in.
 */
export const BasisSpecSchema = z.discriminatedUnion("type", [
  ...BaseCalledDirectionSchema.options,
  ...BaseCalledIdentifierSchema.options,
  PerRoleIdentifierVariantSchema,
  z.object({ type: z.literal("choreographer_specified_direction") }),
  z.object({ type: z.literal("choreographer_specified_identifier") }),
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
  x: pureDir("on_right"),
  y: pureDir("in_front"),
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

// ── BasisSpec serialization (for use in dropdowns) ─────────────────────

function isBaseCalledDirection(spec: BasisSpec): spec is BaseCalledDirection {
  return (
    spec.type === "PureDirection" ||
    spec.type === "TowardsLabel" ||
    spec.type === "TowardsPerson"
  );
}

function isBaseCalledIdentifier(spec: BasisSpec): spec is BaseCalledIdentifier {
  return spec.type === "label" || spec.type === "PersonInDirection";
}

export function basisSpecToKey(spec: BasisSpec): string {
  if (isBaseCalledDirection(spec)) return baseCalledDirectionToKey(spec);
  if (isBaseCalledIdentifier(spec)) return baseCalledIdentifierToKey(spec);
  if (spec.type === "PerRole") return calledIdentifierToKey(spec);
  return spec.type;
}

export function basisSpecFromKey(key: string): BasisSpec {
  if (
    key === "choreographer_specified_direction" ||
    key === "choreographer_specified_identifier"
  ) {
    return { type: key };
  }
  const [prefix, ...rest] = key.split(":");
  if (rest.length === 0) throw new Error(`Invalid BasisSpec key: ${key}`);
  if (
    prefix === "PureDirection" ||
    prefix === "TowardsLabel" ||
    prefix === "TowardsPerson"
  ) {
    return baseCalledDirectionFromKey(key);
  }
  if (prefix === "PerRole") {
    return BasisVectorSpecSchema.parse(calledIdentifierFromKey(key));
  }
  return baseCalledIdentifierFromKey(key);
}

export function basisVectorSpecToKey(spec: BasisVectorSpec): string {
  if (isBaseCalledDirection(spec)) return baseCalledDirectionToKey(spec);
  if (spec.type === "PerRole") return calledIdentifierToKey(spec);
  return baseCalledIdentifierToKey(spec);
}

export function basisVectorSpecFromKey(key: string): BasisVectorSpec {
  const [prefix, ...rest] = key.split(":");
  if (rest.length === 0) throw new Error(`Invalid BasisVectorSpec key: ${key}`);
  if (
    prefix === "PureDirection" ||
    prefix === "TowardsLabel" ||
    prefix === "TowardsPerson"
  ) {
    return baseCalledDirectionFromKey(key);
  }
  if (prefix === "PerRole") {
    return BasisVectorSpecSchema.parse(calledIdentifierFromKey(key));
  }
  return baseCalledIdentifierFromKey(key);
}

export const ALL_BASIS_SPECS: BasisSpec[] = [
  ...ALL_BASE_CALLED_DIRECTIONS,
  ...ALL_BASE_CALLED_IDENTIFIERS,
  { type: "choreographer_specified_direction" },
  { type: "choreographer_specified_identifier" },
];

export const ALL_BASIS_VECTOR_SPECS: BasisVectorSpec[] = [
  ...ALL_BASE_CALLED_DIRECTIONS,
  ...ALL_BASE_CALLED_IDENTIFIERS,
];
