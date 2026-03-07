import { z } from "zod";

import { type DancerId, getRole, type ProtoId } from "./contraCore";
import {
  type PureDirection,
  PureDirectionSchema,
  resolvePureDirection,
} from "./directions";
import { findDancerInDirection, resolveLabel } from "./instructions/_base";
import { LabelSchema } from "./labels";
import { isNTuple, type NTuple, parses } from "./utils";
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
  if (parses(LabelSchema, cid)) return resolveLabel(id, cid, protos);
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

export function getCycle<N extends number>(
  id: DancerId,
  cid: CalledIdentifier,
  protos: Record<ProtoId, Dancer>,
  { length, roles }: { length: N; roles?: "same" | "different" },
): NTuple<N, DancerId> {
  const seen = new Set<DancerId>();
  const cycle: DancerId[] = [];
  let current: DancerId = id;
  while (!seen.has(current)) {
    if (cycle.length > 10)
      throw new Error(
        `"${cid}"-cycle starting at ${id} seems to go on forever: ${cycle.join(", ")}`,
      );
    seen.add(current);
    cycle.push(current);
    const next = resolveCalledIdentifier(current, cid, protos, { roles });
    if (!next) {
      throw new Error(
        `${cid} does not form a cycle including ${id}: ${[...cycle, "null"].join(", ")}`,
      );
    }
    current = next;
  }
  if (current !== id)
    throw new Error(
      `"${cid}"-cycle starting at ${id} does not return to ${id}: ${cycle.join(", ")}`,
    );
  if (!isNTuple(cycle, length))
    throw new Error(
      `"${cid}"-cycle starting at ${id} has length ${cycle.length} instead of ${length}: ${cycle.join(", ")}`,
    );
  return cycle;
}

/** Resolves a dancer's "match" for a figure where dancers pair up. */
export function resolveMatch(
  id: DancerId,
  cid: CalledIdentifier,
  state: WorldState,
  { roles }: { roles?: "same" | "different" } = {},
): DancerId {
  return getCycle(id, cid, state, { length: 2, roles })[1];
}
/** Resolves all dancers' "matches" for a figure where dancers pair up. */
export function resolveMatches(
  cid: CalledIdentifier,
  state: WorldState,
  { roles }: { roles?: "same" | "different" } = {},
): Record<ProtoId, DancerId> {
  return buildProtoRecord((id) => resolveMatch(id, cid, state, { roles }));
}

export function resolveRings(
  state: WorldState,
): Record<ProtoId, NTuple<4, DancerId>> {
  return buildProtoRecord((id) =>
    getCycle(id, "person_in_right_hand", state, {
      length: 4,
      roles: "different",
    }),
  );
}
