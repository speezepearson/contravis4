import { Vector } from "vecti";
import { z } from "zod";

import { type DancerId, isLark, type ProtoId } from "./contraCore";
import { EAST, getDir, NORTH, roughlySameDir, SOUTH, WEST } from "./geometry";
import { findDancerInDirection, resolveLabel } from "./instructions/_base";
import { type Label, LabelSchema } from "./labels";
import { assertNever, getSide, must, parses } from "./utils";
import { Dancer, type WorldState } from "./worldState";

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
export const TowardsLabelDirectionSchema = z.enum(
  LabelSchema.options.map((l) => `towards_${l}`) as [
    TowardsLabelDirection,
    ...TowardsLabelDirection[],
  ],
);

export type TowardsPersonDirection = `towards_person_${PureDirection}`;
export const TowardsPersonDirectionSchema = z.enum(
  PureDirectionSchema.options.map((d) => `towards_person_${d}`) as [
    TowardsPersonDirection,
    ...TowardsPersonDirection[],
  ],
);

export const CalledDirectionSchema = z.enum([
  ...PureDirectionSchema.options,
  ...TowardsLabelDirectionSchema.options,
  ...TowardsPersonDirectionSchema.options,
]);
export type CalledDirection = z.infer<typeof CalledDirectionSchema>;

// ── Lookup maps ─────────────────────────────────────────────────────────

const towardsToLabel = Object.fromEntries(
  LabelSchema.options.map((l) => [`towards_${l}`, l]),
) as Record<TowardsLabelDirection, Label>;

const towardsPersonToDir = Object.fromEntries(
  PureDirectionSchema.options.map((d) => [`towards_person_${d}`, d]),
) as Record<TowardsPersonDirection, PureDirection>;

// ── Resolution functions ────────────────────────────────────────────────

export function resolvePureDirection(
  id: DancerId,
  dir: PureDirection,
  protos: Record<ProtoId, Dancer>,
): Vector {
  const state = Dancer.get(id, protos);
  switch (dir) {
    case "across":
    case "out":
    case "up":
    case "down":
      return must(
        resolveCardinalDirection(dir, state.pos),
        `unable to resolve ${dir} from pos (${state.pos.x}, ${state.pos.y})`,
      );
    case "on_right":
      return state.facing.rotateByDegrees(-90);
    case "on_left":
      return state.facing.rotateByDegrees(90);
    case "in_front":
      return state.facing;
    case "behind":
      return state.facing.multiply(-1);
    case "left_diagonal":
      return state.facing.rotateByDegrees(45);
    case "right_diagonal":
      return state.facing.rotateByDegrees(-45);
    case "larks_left_robins_right":
      return state.facing.rotateByDegrees(90 * (isLark(id) ? 1 : -1));
    case "larks_right_robins_left":
      return state.facing.rotateByDegrees(-90 * (isLark(id) ? 1 : -1));
    default:
      assertNever(dir);
  }
}

export function resolveCalledDirection(
  id: DancerId,
  dir: CalledDirection,
  protos: Record<ProtoId, Dancer>,
): Vector {
  if (parses(PureDirectionSchema, dir)) {
    return resolvePureDirection(id, dir, protos);
  }
  if (parses(TowardsLabelDirectionSchema, dir)) {
    const label = towardsToLabel[dir];
    const themId = resolveLabel(id, label, protos);
    if (!themId) throw new Error(`${id} has no ${label}`);
    return getDir({
      from: Dancer.get(id, protos).pos,
      to: Dancer.get(themId, protos).pos,
    });
  }
  if (parses(TowardsPersonDirectionSchema, dir)) {
    const pureDir = towardsPersonToDir[dir];
    const pureDirVec = resolvePureDirection(id, pureDir, protos);
    const themId = findDancerInDirection(protos, id, pureDirVec);
    if (!themId) throw new Error(`${id} has nobody ${pureDir}`);
    return getDir({
      from: Dancer.get(id, protos).pos,
      to: Dancer.get(themId, protos).pos,
    });
  }
  assertNever(dir);
}

/** For a "towards" CalledDirection, resolves the target person. Returns undefined for pure directions. */
export function resolveCalledDirectionTarget(
  id: DancerId,
  dir: CalledDirection,
  protos: Record<ProtoId, Dancer>,
): DancerId | undefined {
  if (parses(PureDirectionSchema, dir)) return undefined;
  if (parses(TowardsLabelDirectionSchema, dir)) {
    return resolveLabel(id, towardsToLabel[dir], protos) ?? undefined;
  }
  const pureDir = towardsPersonToDir[dir as TowardsPersonDirection];
  const pureDirVec = resolvePureDirection(id, pureDir, protos);
  return findDancerInDirection(protos, id, pureDirVec) ?? undefined;
}

/** Find the dancer best described by "the person to your [...]", if any. */
export function findDancerInCalledDirection(
  id: ProtoId,
  side: CalledDirection,
  dancers: Record<ProtoId, Dancer>,
  { roles }: { roles?: "same" | "different" } = {},
): DancerId | null {
  const dir = resolveCalledDirection(id, side, dancers);
  return findDancerInDirection(dancers, id, dir, { roles });
}

/** True when a dancer faces roughly away from the center line (x = 0). */
export function facesOut(
  id: DancerId,
  state: WorldState,
  {
    errMsg = `unable to resolve dir 'out' at dancer ${id}'s pos`,
  }: { errMsg?: string } = {},
): boolean {
  const { facing, pos } = Dancer.get(id, state);
  return roughlySameDir(
    facing,
    must(resolveCardinalDirection("out", pos), errMsg),
  );
}

/** True when a dancer faces toward the center line (x = 0). */
export function facesAcross(
  id: DancerId,
  state: WorldState,
  {
    errMsg = `unable to resolve dir 'across' at dancer ${id}'s pos`,
  }: { errMsg?: string } = {},
): boolean {
  const { facing, pos } = Dancer.get(id, state);
  return roughlySameDir(
    facing,
    must(resolveCardinalDirection("across", pos), errMsg),
  );
}
