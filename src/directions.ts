/**
 * Direction types and resolution.
 *
 * A "direction" resolves to a direction vector (not a specific dancer).
 * There are three layers, from concrete to abstract:
 *
 *   CardinalDirection — "up", "down", "across", "out"
 *     Absolute directions determined solely by position on the floor.
 *
 *   PureDirection — CardinalDirection + facing-relative directions
 *     ("on_left", "in_front", "right_diagonal", "larks_left_robins_right", …)
 *     Resolves to a vector using only the dancer's own position and facing.
 *
 *   CalledDirection = PureDirection | TowardsLabelDirection | TowardsPersonDirection
 *     The full set of directions that can appear in instruction schemas.
 *     The "towards_" variants resolve by finding a target dancer first, then
 *     returning the direction from the source dancer to that target:
 *       - TowardsLabelDirection ("towards_partner", "towards_neighbor", …)
 *           looks up the target by Label (see labels.ts).
 *       - TowardsPersonDirection ("towards_person_on_right", …)
 *           finds the nearest dancer in the given PureDirection.
 *
 * Resolution is done via Dancer methods (see worldState.ts):
 *   dancer.resolvePureDirection(dir)
 *   dancer.resolveCalledDirection(dir)
 *   dancer.resolveCalledDirectionTarget(dir)
 *   dancer.findDancerInCalledDirection(side)
 *   dancer.facesOut()
 *   dancer.facesAcross()
 *
 * See also: identifiers.ts for CalledIdentifier, which resolves to a
 * specific dancer rather than a direction vector.
 */

import { Vector } from "vecti";
import { z } from "zod";

import { EAST, NORTH, SOUTH, WEST } from "./geometry";
import { type Label, LabelSchema } from "./labels";
import {
  type AssertEquals,
  assertNever,
  buildEnumRecord,
  getSide,
  stripPrefix,
} from "./utils";

export const CardinalDirectionSchema = z.enum(["up", "down", "across", "out"]);
export type CardinalDirection = z.infer<typeof CardinalDirectionSchema>;
export function resolveCardinalDirection(
  dir: CardinalDirection,
  pos: Vector,
): Vector | undefined {
  switch (dir) {
    case "up":
      return NORTH;
    case "down":
      return SOUTH;
    case "across": {
      const side = getSide(pos);
      if (!side) return undefined;
      return { west: EAST, east: WEST }[side];
    }
    case "out": {
      const side = getSide(pos);
      if (!side) return undefined;
      return { west: WEST, east: EAST }[side];
    }
    default:
      assertNever(dir);
  }
}

export const PureDirectionSchema = z.enum([
  "across",
  "out",
  "up",
  "down",
  "on_right",
  "on_left",
  "in_front",
  "behind",
  "left_diagonal",
  "right_diagonal",
  "larks_left_robins_right",
  "larks_right_robins_left",
]);
export type PureDirection = z.infer<typeof PureDirectionSchema>;

// ── CalledDirection: resolves to a direction vector ─────────────────────

export type TowardsLabelDirection = `towards_${Label}`;
null satisfies AssertEquals<
  TowardsLabelDirection,
  z.infer<typeof TowardsLabelDirectionSchema>
>;
export const TowardsLabelDirectionSchema = z.enum(
  LabelSchema.options.map((l) => `towards_${l}` as const),
);

export type TowardsPersonDirection = `towards_person_${PureDirection}`;
null satisfies AssertEquals<
  TowardsPersonDirection,
  z.infer<typeof TowardsPersonDirectionSchema>
>;
export const TowardsPersonDirectionSchema = z.enum(
  PureDirectionSchema.options.map((d) => `towards_person_${d}` as const),
);

export const CalledDirectionSchema = z.enum([
  ...PureDirectionSchema.options,
  ...TowardsLabelDirectionSchema.options,
  ...TowardsPersonDirectionSchema.options,
]);
export type CalledDirection = z.infer<typeof CalledDirectionSchema>;

// ── Lookup maps (used by Dancer methods in worldState.ts) ───────────────

export const towardsToLabel: Record<TowardsLabelDirection, Label> =
  buildEnumRecord(TowardsLabelDirectionSchema, (l) =>
    stripPrefix("towards_", l),
  );

export const towardsPersonToDir: Record<TowardsPersonDirection, PureDirection> =
  buildEnumRecord(TowardsPersonDirectionSchema, (d) =>
    stripPrefix("towards_person_", d),
  );
