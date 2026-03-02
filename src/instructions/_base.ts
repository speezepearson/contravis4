import type { Vector } from "vecti";
import { z } from "zod";

import {
  ALL_PROTO_IDS,
  type Beats,
  BeatsSchema,
  type DancerId,
  getRelationship,
  parseDancerId,
  parseProtoId,
  projectDancerIdToProtoId,
  type ProtoId,
  protoIdToDancerId,
  type Relationship,
  RelationshipSchema,
  resolveRelationship,
} from "../contraCore";
import { EAST, NORTH, SOUTH, WEST } from "../geometry";
import { assertNever } from "../utils";
import {
  type DancerState,
  getDancerState,
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
export function getCardinalBearing(
  dir: CardinalDirection,
  pos: Vector,
): Vector {
  switch (dir) {
    case "up":
      return NORTH;
    case "down":
      return SOUTH;
    case "across":
      return pos.x < 0 ? EAST : WEST;
    case "out":
      return pos.x < 0 ? WEST : EAST;
    default:
      assertNever(dir);
  }
}

// Direction relative to a dancer: a named direction or a relationship
export const RelativeDirectionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("direction"),
    value: z.enum([
      ...CardinalDirectionSchema.options,
      "progression",
      "forward",
      "back",
      "right",
      "left",
    ]),
  }),
  z.object({ kind: z.literal("relationship"), value: RelationshipSchema }),
]);
export type RelativeDirection = z.infer<typeof RelativeDirectionSchema>;

/** Resolve a RelativeDirection to a unit heading vector for a specific dancer. */
export function resolveRelativeDirection(
  dir: RelativeDirection,
  id: DancerId,
  protos: Record<ProtoId, DancerState>,
): Vector {
  id = projectDancerIdToProtoId(id);
  const d = getDancerState(id, protos);
  if (dir.kind === "direction") {
    const v = dir.value;
    switch (v) {
      case "up":
        return NORTH;
      case "down":
        return SOUTH;
      case "across":
        return d.pos.x < 0 ? EAST : WEST;
      case "out":
        return d.pos.x < 0 ? WEST : EAST;
      case "progression":
        return { up: NORTH, down: SOUTH }[parseProtoId(d.protoId).dir];
      case "forward":
        return d.facing;
      case "back":
        return d.facing.multiply(-1);
      case "right":
        return d.facing.rotateByDegrees(-90);
      case "left":
        return d.facing.rotateByDegrees(90);
      default:
        return assertNever(v);
    }
  }
  // relationship: toward the matched other dancer
  const there = getDancerState(
    resolveRelationship(d.protoId, dir.value),
    protos,
  ).pos;
  return there.subtract(d.pos).normalize();
}

export type Animator = (init: WorldState, who: Set<ProtoId>) => ContraAnimation;
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

export type InstructionAnimator<Instr> = (
  init: WorldState,
  who: Set<ProtoId>,
  instr: Instr,
) => ContraAnimation;

export const DirectionalRelationshipSchema = z.enum([
  "on_left",
  "on_right",
  "in_front",
  "larks_left_robins_right",
  "larks_right_robins_left",
]);
export type DirectionalRelationship = z.infer<
  typeof DirectionalRelationshipSchema
>;

export function findDancerInDirection(
  protos: Record<ProtoId, DancerState>,
  id: ProtoId,
  dir: Vector,
): { id: DancerId; rel: Relationship } | null {
  dir = dir.normalize();
  const pos = protos[id].pos;

  let bestScore = Infinity;
  let bestTarget: { id: DancerId; rel: Relationship } | null = null;

  for (const otherId of ALL_PROTO_IDS) {
    if (otherId === id) continue;
    const dyBase = protos[otherId].pos.y - pos.y;
    const oBest = Math.round(-dyBase / 2);
    for (let o = oBest - 2; o <= oBest + 2; o++) {
      const targetId = protoIdToDancerId(otherId, o);
      const target = getDancerState(targetId, protos);
      const disp = target.pos.subtract(pos);
      const r = disp.length();
      if (r > 1.2 || r < 1e-9) continue;

      const cosTheta = dir.dot(disp) / r;
      if (cosTheta < 0) continue;
      const cos2Theta = 2 * cosTheta * cosTheta - 1;
      if (cos2Theta < 0.01) continue;

      const score = r / cos2Theta;
      if (score < bestScore) {
        bestScore = score;
        const rel = getRelationship(id, targetId);
        if (!rel)
          throw new Error(
            `Programming error: somehow found a dancer ${dir.toString()} of ${id} with no relationship to them`,
          );
        bestTarget = { id: targetId, rel };
      }
    }
  }

  return bestTarget;
}

/** Find the dancer best described by "the person on your [side]", if any. */
export function findDancerOnSide(
  id: ProtoId,
  side: DirectionalRelationship,
  dancers: Record<ProtoId, DancerState>,
): { id: DancerId; rel: Relationship } | null {
  const BIAS = (0.777 * Math.PI) / 2; // ~70°, bias towards "in front"
  const lark = parseDancerId(id).role === "lark";
  const angleOffset =
    side === "on_right"
      ? -BIAS
      : side === "on_left"
        ? BIAS
        : side === "in_front"
          ? 0
          : side === "larks_left_robins_right"
            ? lark
              ? BIAS
              : -BIAS
            : side === "larks_right_robins_left"
              ? lark
                ? -BIAS
                : BIAS
              : assertNever(side);
  const d = dancers[id];
  const heading = d.facing.rotateByRadians(angleOffset);

  return findDancerInDirection(dancers, id, heading);
}

export function chainAnimations(segments: ContraAnimation[]): ContraAnimation {
  if (segments.length === 0) {
    throw new Error("chainAnimations requires at least one segment");
  }
  return {
    dur: segments.reduce((acc, segment) => acc + segment.dur, 0),
    getFrame(t) {
      let accumulatedDur = 0;
      for (const segment of segments) {
        if (t < accumulatedDur)
          throw new Error(`somehow overshot the desired time`);
        if (t > accumulatedDur + segment.dur) {
          accumulatedDur += segment.dur;
          continue;
        }
        return segment.getFrame(t - accumulatedDur);
      }
      throw new Error(`time ${t} is out of range for this animation sequence`);
    },
  };
}
