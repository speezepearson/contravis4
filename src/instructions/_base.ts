import { Vector } from "vecti";
import { z } from "zod";

import {
  addOffsetToId,
  ALL_PROTO_IDS,
  BasicLabelSchema,
  type Beats,
  BeatsSchema,
  type DancerId,
  getRole,
  isLark,
  parseDancerId,
  type ProtoId,
  protoIdToDancerId,
} from "../contraCore";
import { EAST, getDir, NORTH, roughlySameDir, SOUTH, WEST } from "../geometry";
import { assertNever, getSide, isNTuple, type NTuple, parses } from "../utils";
import {
  buildProtoRecord,
  Dancer,
  resolveBasicLabel,
  type WorldState,
} from "../worldState";

export const InstructionIdSchema = z.string().uuid();
export type InstructionId = z.infer<typeof InstructionIdSchema>;

export const instructionBaseSchemaFields = {
  id: InstructionIdSchema,
  beats: BeatsSchema,
};

export const CardinalDirectionSchema = z.enum(["up", "down", "across", "out"]);
export type CardinalDirection = z.infer<typeof CardinalDirectionSchema>;
export function resolveCardinalDirection(
  dir: CardinalDirection,
  pos: Vector,
  {
    errMsg = `unable to resolve ${dir} from pos (${pos.x}, ${pos.y})`,
  }: { errMsg?: string } = {},
): Vector {
  switch (dir) {
    case "up":
      return NORTH;
    case "down":
      return SOUTH;
    case "across":
      return { west: EAST, east: WEST }[getSide(pos, { errMsg })];
    case "out":
      return { west: WEST, east: EAST }[getSide(pos, { errMsg })];
    default:
      assertNever(dir);
  }
}

export type Animator = (
  init: WorldState,
  who: ReadonlySet<ProtoId>,
) => ContraAnimation;
export function chainAnimators(animators: Animator[]): Animator {
  return (init, who) => {
    if (animators.length === 0) {
      return { dur: 0, getFrame: () => init };
    }
    const animations: ContraAnimation[] = [];
    for (const animator of animators) {
      const lastAnimation = animations[animations.length - 1];
      animations.push(
        animator(
          lastAnimation ? lastAnimation.getFrame(lastAnimation.dur) : init,
          who,
        ),
      );
    }
    return chainAnimations(animations);
  };
}

/** A continuous function from beat time to world state, used for rendering intermediate frames. */
export type ContraAnimation = {
  dur: Beats;
  getFrame: (t: Beats) => WorldState;
};

const DerivedLabelSchema = z.enum([
  "opposite",
  "next neighbor",
  "next x2 neighbor",
  "next x3 neighbor",
  "prev neighbor",
  "prev x2 neighbor",
  "prev x3 neighbor",
  "in right hand",
  "in left hand",
]);

export const CalledLabelSchema = z.enum([
  ...BasicLabelSchema.options,
  ...DerivedLabelSchema.options,
]);
export type CalledLabel = z.infer<typeof CalledLabelSchema>;
export function resolveCalledLabel(
  label: CalledLabel,
  id: DancerId,
  protos: Record<ProtoId, Dancer>,
): DancerId | null {
  if (parses(BasicLabelSchema, label)) {
    return resolveBasicLabel(label, id, protos);
  }
  switch (label) {
    case "opposite": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return resolveBasicLabel("partner", neighbor, protos);
    }
    case "next neighbor": {
      const offsetSign = parseDancerId(id).dir === "up" ? 1 : -1;
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, 1 * offsetSign);
    }
    case "next x2 neighbor": {
      const offsetSign = parseDancerId(id).dir === "up" ? 1 : -1;
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, 2 * offsetSign);
    }
    case "next x3 neighbor": {
      const offsetSign = parseDancerId(id).dir === "up" ? 1 : -1;
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, 3 * offsetSign);
    }
    case "prev neighbor": {
      const offsetSign = parseDancerId(id).dir === "up" ? 1 : -1;
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, -1 * offsetSign);
    }
    case "prev x2 neighbor": {
      const offsetSign = parseDancerId(id).dir === "up" ? 1 : -1;
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, -2 * offsetSign);
    }
    case "prev x3 neighbor": {
      const offsetSign = parseDancerId(id).dir === "up" ? 1 : -1;
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, -3 * offsetSign);
    }
    case "in right hand": {
      return Dancer.get(id, protos).hands["right"]?.theirId ?? null;
    }
    case "in left hand": {
      return Dancer.get(id, protos).hands["left"]?.theirId ?? null;
    }
    default:
      assertNever(label);
  }
}

export const PositionBasedDirectionSchema = z.enum([
  "across",
  "out",
  "up",
  "down",
]);
export const FacingBasedDirectionSchema = z.enum([
  "on_right",
  "on_left",
  "in_front",
  "behind",
  "left_diagonal",
  "right_diagonal",
  "larks_left_robins_right",
  "larks_right_robins_left",
]);

export const CalledDirectionSchema = z.enum([
  ...PositionBasedDirectionSchema.options,
  ...FacingBasedDirectionSchema.options,
  ...CalledLabelSchema.options,
]);
export type CalledDirection = z.infer<typeof CalledDirectionSchema>;
export function resolveCalledDirection(
  id: DancerId,
  dir: CalledDirection,
  protos: Record<ProtoId, Dancer>,
): Vector {
  if (parses(CalledLabelSchema, dir)) {
    const themId = resolveCalledLabel(dir, id, protos);
    if (!themId) throw new Error(`${id} has no ${dir}`);
    return getDir({
      from: Dancer.get(id, protos).pos,
      to: Dancer.get(themId, protos).pos,
    });
  }
  const state = Dancer.get(id, protos);
  switch (dir) {
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
    case "across":
    case "out":
    case "up":
    case "down":
      return resolveCardinalDirection(dir, state.pos);
    default:
      assertNever(dir);
  }
}

export const CalledIdentifierSchema = z.enum([
  ...CalledLabelSchema.options,
  ...CalledDirectionSchema.options,
]);
export type CalledIdentifier = z.infer<typeof CalledIdentifierSchema>;
export function resolveCalledIdentifier(
  id: DancerId,
  cid: CalledIdentifier,
  protos: Record<ProtoId, Dancer>,
  { roles }: { roles?: "same" | "different" } = {},
): DancerId | null {
  if (parses(CalledLabelSchema, cid))
    return resolveCalledLabel(cid, id, protos);
  const dir = resolveCalledDirection(id, cid, protos);
  const res = findDancerInDirection(protos, id, dir, { roles });
  if (!res) return null;
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
    case "next neighbor":
    case "next x2 neighbor":
    case "next x3 neighbor":
    case "prev neighbor":
    case "prev x2 neighbor":
    case "prev x3 neighbor":
    case "partner":
    case "shadow":
    case "shadow 2":
    case "shadow 3":
    case "shadow 4":
    case "shadow 5":
    case "shadow 6":
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
    getCycle(id, "in right hand", state, { length: 4, roles: "different" }),
  );
}

/** True when a dancer faces roughly away from the center line (x = 0). */
export function facesOut(
  id: DancerId,
  state: WorldState,
  { errMsg }: { errMsg?: string } = {},
): boolean {
  const { facing, pos } = Dancer.get(id, state);
  return roughlySameDir(
    facing,
    resolveCardinalDirection("out", pos, { errMsg }),
  );
}

/** True when a dancer faces toward the center line (x = 0). */
export function facesAcross(
  id: DancerId,
  state: WorldState,
  { errMsg }: { errMsg?: string } = {},
): boolean {
  const { facing, pos } = Dancer.get(id, state);
  return roughlySameDir(
    facing,
    resolveCardinalDirection("across", pos, { errMsg }),
  );
}

export function avgDancerPos(dancers: DancerId[], state: WorldState): Vector {
  let sum = new Vector(0, 0);
  for (const id of dancers) {
    sum = sum.add(Dancer.get(id, state).pos);
  }
  return sum.divide(dancers.length);
}

export function findDancerInDirection(
  protos: Record<ProtoId, Dancer>,
  id: DancerId,
  dir: Vector,
  { roles }: { roles?: "same" | "different" } = {},
): DancerId | null {
  dir = dir.normalize();
  const pos = Dancer.get(id, protos).pos;

  let bestScore = Infinity;
  let bestTarget: DancerId | null = null;

  for (const otherProtoId of ALL_PROTO_IDS) {
    if (otherProtoId === id) continue;
    if (roles === "same" && getRole(otherProtoId) !== getRole(id)) continue;
    if (roles === "different" && getRole(otherProtoId) === getRole(id))
      continue;

    const otherProto = protos[otherProtoId];
    const dyBase = otherProto.pos.y - pos.y;
    const oBest = Math.round(-dyBase / 2);
    for (let o = oBest - 2; o <= oBest + 2; o++) {
      const targetId = protoIdToDancerId(otherProtoId, o);
      const target = Dancer.get(targetId, protos);
      const disp = target.pos.subtract(pos);
      const r = disp.length();
      if (r > 1.8 || r < 1e-9) continue;

      const cosTheta = dir.dot(disp) / r;
      if (cosTheta < 0) continue;
      const cos2Theta = 2 * cosTheta * cosTheta - 1;
      if (cos2Theta < 0.01) continue;

      const score = r / cos2Theta;
      if (score < bestScore) {
        bestScore = score;
        bestTarget = targetId;
      }
    }
  }

  return bestTarget;
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

export function findClosestDancer(
  pos: Vector,
  state: WorldState,
  { exclude }: { exclude: DancerId[] },
): DancerId {
  const excludeSet = new Set<DancerId>(exclude);
  let bestDist = Infinity;
  let bestId: DancerId | null = null;

  for (let halfWidth = 2; ; halfWidth += 2) {
    const prevHalfWidth = halfWidth - 2;
    for (const protoId of ALL_PROTO_IDS) {
      const dyBase = state[protoId].pos.y - pos.y;
      const oBest = Math.round(-dyBase / 2);

      for (let o = oBest - halfWidth; o <= oBest + halfWidth; o++) {
        if (
          halfWidth > 2 &&
          o >= oBest - prevHalfWidth &&
          o <= oBest + prevHalfWidth
        )
          continue;

        const targetId = protoIdToDancerId(protoId, o);
        if (excludeSet.has(targetId)) continue;

        const target = Dancer.get(targetId, state);
        const dist = target.pos.subtract(pos).length();

        if (dist < bestDist) {
          bestDist = dist;
          bestId = targetId;
        }
      }
    }

    // At the next widening, new offsets have Y distance >= 2*halfWidth+1 from pos.
    // Since total distance >= Y distance, if bestDist is less, no future candidate can beat it.
    if (bestId !== null && bestDist < 2 * halfWidth + 1) break;

    if (halfWidth > 100) {
      throw new Error(
        `findClosestDancer: could not find a non-excluded dancer near (${pos.x}, ${pos.y})`,
      );
    }
  }

  if (!bestId) {
    throw new Error(
      `findClosestDancer: could not find a non-excluded dancer near (${pos.x}, ${pos.y})`,
    );
  }

  return bestId;
}

export function resolveShortLines(
  state: WorldState,
): Record<ProtoId, NTuple<4, DancerId>> {
  return buildProtoRecord((protoId) => {
    const protoY = state[protoId].pos.y;

    const line: { id: DancerId; x: number }[] = [];

    for (const otherProtoId of ALL_PROTO_IDS) {
      const dyBase = state[otherProtoId].pos.y - protoY;
      const oBest = Math.round(-dyBase / 2);

      // Find the offset copy closest in y
      let bestId: DancerId | null = null;
      let bestYDist = Infinity;
      let bestX = 0;
      for (let o = oBest - 1; o <= oBest + 1; o++) {
        const id = protoIdToDancerId(otherProtoId, o);
        const target = Dancer.get(id, state);
        const yDist = Math.abs(target.pos.y - protoY);
        if (yDist < bestYDist) {
          bestId = id;
          bestYDist = yDist;
          bestX = target.pos.x;
        }
      }

      if (bestYDist > 0.5) {
        throw new Error(
          `resolveShortLines: closest copy of ${otherProtoId} is ${bestYDist.toFixed(3)} away in y from ${protoId} (max 0.5)`,
        );
      }

      line.push({ id: bestId!, x: bestX });
    }

    line.sort((a, b) => a.x - b.x);
    return line.map((c) => c.id) as NTuple<4, DancerId>;
  });
}

export function chainAnimations(segments: ContraAnimation[]): ContraAnimation {
  if (segments.length === 0) {
    throw new Error("chainAnimations requires at least one segment");
  }
  return {
    dur: segments.reduce((acc, segment) => acc + segment.dur, 0),
    getFrame(t) {
      let accumulatedDur = 0;
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (t >= accumulatedDur + segment.dur && i < segments.length - 1) {
          accumulatedDur += segment.dur;
          continue;
        }
        return segment.getFrame(t - accumulatedDur);
      }
      throw new Error(`time ${t} is out of range for this animation sequence`);
    },
  };
}
