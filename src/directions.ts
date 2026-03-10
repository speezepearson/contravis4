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
 *   CalledDirection = { type: 'PureDirection', dir } | { type: 'TowardsLabel', label } | { type: 'TowardsPerson', roughDir }
 *     The full set of directions that can appear in instruction schemas.
 *     The "towards" variants resolve by finding a target dancer first, then
 *     returning the direction from the source dancer to that target:
 *       - TowardsLabel: looks up the target by Label (see labels.ts).
 *       - TowardsPerson: finds the nearest dancer in the given PureDirection.
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
import { assertNever, getSide } from "./utils";

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
  "setclockwise",
  "setcounterclockwise",
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

// ── CalledDirection: discriminated union resolving to a direction vector ──

export const PureDirectionVariantSchema = z.object({
  type: z.literal("PureDirection"),
  dir: PureDirectionSchema,
});

export const TowardsLabelVariantSchema = z.object({
  type: z.literal("TowardsLabel"),
  label: LabelSchema,
});

export const TowardsPersonVariantSchema = z.object({
  type: z.literal("TowardsPerson"),
  roughDir: PureDirectionSchema,
});

export const CalledDirectionSchema = z.discriminatedUnion("type", [
  PureDirectionVariantSchema,
  TowardsLabelVariantSchema,
  TowardsPersonVariantSchema,
]);
export type CalledDirection = z.infer<typeof CalledDirectionSchema>;

// ── Constructor helpers ─────────────────────────────────────────────────

export function pureDir(dir: PureDirection): CalledDirection & { type: "PureDirection" } {
  return { type: "PureDirection", dir };
}
export function towardsLabel(label: Label): CalledDirection & { type: "TowardsLabel" } {
  return { type: "TowardsLabel", label };
}
export function towardsPerson(roughDir: PureDirection): CalledDirection & { type: "TowardsPerson" } {
  return { type: "TowardsPerson", roughDir };
}

// ── All possible CalledDirection values (for UI enumeration) ────────────

export const ALL_CALLED_DIRECTIONS: CalledDirection[] = [
  ...PureDirectionSchema.options.map((dir) => pureDir(dir)),
  ...LabelSchema.options.map((label) => towardsLabel(label)),
  ...PureDirectionSchema.options.map((roughDir) => towardsPerson(roughDir)),
];

// ── Serialization (for use as dropdown keys, etc.) ──────────────────────

export function calledDirectionToKey(cd: CalledDirection): string {
  switch (cd.type) {
    case "PureDirection":
      return `PureDirection:${cd.dir}`;
    case "TowardsLabel":
      return `TowardsLabel:${cd.label}`;
    case "TowardsPerson":
      return `TowardsPerson:${cd.roughDir}`;
    default:
      assertNever(cd);
  }
}

export function calledDirectionFromKey(key: string): CalledDirection {
  const colonIndex = key.indexOf(":");
  const type = key.slice(0, colonIndex);
  const val = key.slice(colonIndex + 1);
  switch (type) {
    case "PureDirection":
      return pureDir(PureDirectionSchema.parse(val));
    case "TowardsLabel":
      return towardsLabel(LabelSchema.parse(val));
    case "TowardsPerson":
      return towardsPerson(PureDirectionSchema.parse(val));
    default:
      throw new Error(`Invalid CalledDirection key: ${key}`);
  }
}
