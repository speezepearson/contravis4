/**
 * Identifier types and resolution.
 *
 * A "called identifier" resolves to a specific dancer (not a direction vector).
 *
 *   CalledIdentifier = Label | PersonInDirection
 *     The full set of identifiers that can appear in instruction schemas
 *     (e.g. as the "cid" field of a swing or allemande).
 *       - Label ("partner", "neighbor", "shadow_2", …)
 *           resolved via resolveLabel in _base.ts using relationship tracking.
 *       - PersonInDirection ("person_on_right", "person_in_front", …)
 *           finds the nearest dancer in the given PureDirection (see directions.ts).
 *
 * The higher-level helpers (resolveMatch, resolveMatches)
 * build on resolveCalledIdentifier to handle pairing up dancers.
 *
 * See also: directions.ts for CalledDirection, which resolves to a direction
 * vector rather than a specific dancer.
 */

import { z } from "zod";

import { type DancerId, getRole, type ProtoId } from "./contraCore";
import {
  type PureDirection,
  PureDirectionSchema,
  resolvePureDirection,
} from "./directions";
import { findDancerInDirection } from "./instructions/_base";
import { LabelSchema } from "./labels";
import { must, parses } from "./utils";
import { buildProtoRecord, Dancer, type WorldState } from "./worldState";

// ── CalledIdentifier: "the person [X]" — identifies a specific dancer ───

export type PersonInDirection = `person_${PureDirection}`;
export const PersonInDirectionSchema = z.enum(
  PureDirectionSchema.options.map((d) => `person_${d}`) as [
    PersonInDirection,
    ...PersonInDirection[],
  ],
);

export const CalledIdentifierSchema = z.enum([
  ...LabelSchema.options,
  ...PersonInDirectionSchema.options,
]);
export type CalledIdentifier = z.infer<typeof CalledIdentifierSchema>;

// ── Lookup map ──────────────────────────────────────────────────────────

const personInToDir = Object.fromEntries(
  PureDirectionSchema.options.map((d) => [`person_${d}`, d]),
) as Record<PersonInDirection, PureDirection>;

// ── Resolution functions ────────────────────────────────────────────────

export function resolveCalledIdentifier(
  id: DancerId,
  cid: CalledIdentifier,
  protos: Record<ProtoId, Dancer>,
  { roles }: { roles?: "same" | "different" } = {},
): DancerId | undefined {
  if (parses(LabelSchema, cid)) return Dancer.get(id, protos).resolveLabel(cid, protos)?.id ?? undefined;
  const pureDir = personInToDir[cid as PersonInDirection];
  const dir = resolvePureDirection(id, pureDir, protos);
  const res = findDancerInDirection(protos, id, dir, { roles });
  if (!res) return undefined;
  if (roles === "same" && getRole(id) !== getRole(res))
    throw new Error(
      `it's crazy to ask for somebody's ${cid} with the ${roles} role`,
    );
  if (roles === "different" && getRole(id) === getRole(res))
    throw new Error(
      `it's crazy to ask for somebody's ${cid} with the ${roles} role`,
    );
  return res;
}

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

/** Resolves a dancer's "match" for a figure where dancers pair up. */
export function resolveMatch(
  id: DancerId,
  cid: CalledIdentifier,
  state: WorldState,
  { roles }: { roles?: "same" | "different" } = {},
): DancerId {
  const res = must(
    resolveCalledIdentifier(id, cid, state, { roles }),
    `${id} can't find ${JSON.stringify(cid)}`,
  );
  const symm = must(
    resolveCalledIdentifier(res, cid, state, { roles }),
    `${res} can't find ${JSON.stringify(cid)}`,
  );
  if (symm !== id)
    throw new Error(
      `asymmetry pairing dancers up: ${id} thinks ${JSON.stringify(symm)} is ${res}, but ${res} thinks ${JSON.stringify(id)} is ${symm}`,
    );
  return res;
}
/** Resolves all dancers' "matches" for a figure where dancers pair up. */
export function resolveMatches(
  cid: CalledIdentifier,
  state: WorldState,
  { roles }: { roles?: "same" | "different" } = {},
): Record<ProtoId, DancerId> {
  return buildProtoRecord((id) => resolveMatch(id, cid, state, { roles }));
}
