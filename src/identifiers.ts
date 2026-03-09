/**
 * Identifier types and resolution.
 *
 * A "called identifier" resolves to a specific dancer (not a direction vector).
 *
 *   CalledIdentifier = Label | PersonInDirection
 *     The full set of identifiers that can appear in instruction schemas
 *     (e.g. as the "cid" field of a swing or allemande).
 *       - Label ("partner", "neighbor", "shadow_2", …)
 *           resolved via Dancer.resolveLabel using relationship tracking.
 *       - PersonInDirection ("person_on_right", "person_in_front", …)
 *           finds the nearest dancer in the given PureDirection (see directions.ts).
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
import { LabelSchema } from "./labels";
import { buildEnumRecord, stripPrefix } from "./utils";

// ── CalledIdentifier: "the person [X]" — identifies a specific dancer ───

export type PersonInDirection = `person_${PureDirection}`;

export const PersonInDirectionSchema = z.enum(
  PureDirectionSchema.options.map((d) => `person_${d}` as const),
);

export const CalledIdentifierSchema = z.enum([
  ...LabelSchema.options,
  ...PersonInDirectionSchema.options,
]);
export type CalledIdentifier = z.infer<typeof CalledIdentifierSchema>;

// ── Lookup map (used by Dancer methods in worldState.ts) ────────────────

export const personInToDir = buildEnumRecord(PersonInDirectionSchema, (d) =>
  stripPrefix("person_", d),
);

// ── Pure functions ──────────────────────────────────────────────────────

export function inferRoleOfCalledIdentifier(
  cid: CalledIdentifier,
): "same" | "different" | null {
  switch (cid) {
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
