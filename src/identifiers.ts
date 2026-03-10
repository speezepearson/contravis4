/**
 * Identifier types and resolution.
 *
 * A "called identifier" resolves to a specific dancer (not a direction vector).
 *
 *   CalledIdentifier = { type: 'label', label } | { type: 'PersonInDirection', dir }
 *     The full set of identifiers that can appear in instruction schemas
 *     (e.g. as the "cid" field of a swing or allemande).
 *       - label: resolved via Dancer.resolveLabel using relationship tracking.
 *       - PersonInDirection: finds the nearest dancer in the given PureDirection.
 *
 * Resolution is done via Dancer methods (see worldState.ts):
 *   dancer.resolveCalledIdentifier(cid)
 *   dancer.resolveMatch(cid)
 *
 * See also: directions.ts for CalledDirection, which resolves to a direction
 * vector rather than a specific dancer.
 */

import { z } from "zod";

import { type PureDirection, PureDirectionSchema } from "./directions";
import { type Label, LabelSchema } from "./labels";
import { assertNever } from "./utils";

// ── CalledIdentifier: discriminated union identifying a specific dancer ───

export const LabelVariantSchema = z.object({
  type: z.literal("label"),
  label: LabelSchema,
});

export const PersonInDirectionVariantSchema = z.object({
  type: z.literal("PersonInDirection"),
  dir: PureDirectionSchema,
});

export const CalledIdentifierSchema = z.discriminatedUnion("type", [
  LabelVariantSchema,
  PersonInDirectionVariantSchema,
]);
export type CalledIdentifier = z.infer<typeof CalledIdentifierSchema>;

// ── Constructor helpers ─────────────────────────────────────────────────

export function labelId(label: Label): CalledIdentifier & { type: "label" } {
  return { type: "label", label };
}
export function personInDir(
  dir: PureDirection,
): CalledIdentifier & { type: "PersonInDirection" } {
  return { type: "PersonInDirection", dir };
}

// ── All possible CalledIdentifier values (for UI enumeration) ───────────

export const ALL_CALLED_IDENTIFIERS: CalledIdentifier[] = [
  ...LabelSchema.options.map((label) => labelId(label)),
  ...PureDirectionSchema.options.map((dir) => personInDir(dir)),
];

// ── Serialization (for use as dropdown keys, etc.) ──────────────────────

export function calledIdentifierToKey(cid: CalledIdentifier): string {
  switch (cid.type) {
    case "label":
      return `label:${cid.label}`;
    case "PersonInDirection":
      return `PersonInDirection:${cid.dir}`;
    default:
      assertNever(cid);
  }
}

export function calledIdentifierFromKey(key: string): CalledIdentifier {
  const [type, ...rest] = key.split(":");
  const val = rest.join(":");
  switch (type) {
    case "label":
      return labelId(LabelSchema.parse(val));
    case "PersonInDirection":
      return personInDir(PureDirectionSchema.parse(val));
    default:
      throw new Error(`Invalid CalledIdentifier key: ${key}`);
  }
}

// ── Pure functions ──────────────────────────────────────────────────────

export function inferRoleOfCalledIdentifier(
  cid: CalledIdentifier,
): "same" | "different" | null {
  if (cid.type === "PersonInDirection") return null;
  switch (cid.label) {
    case "neighbor":
    case "next_neighbor":
    case "next_x2_neighbor":
    case "next_x3_neighbor":
    case "prev_neighbor":
    case "prev_x2_neighbor":
    case "prev_x3_neighbor":
    case "partner":
    case "shadow":
    case "shadow_2":
    case "shadow_3":
    case "shadow_4":
    case "shadow_5":
    case "shadow_6":
      return "different";
    case "opposite":
      return "same";
  }
  return null;
}
