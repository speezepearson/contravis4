import { Vector } from "vecti";
import { z } from "zod";

import {
  addOffsetToId,
  ALL_PROTO_IDS,
  type Beats,
  BeatsSchema,
  type DancerId,
  getProgDirSign,
  getRole,
  type ProtoId,
  protoIdToDancerId,
} from "../contraCore";
import {
  type InfallibleLabel,
  InfallibleLabelSchema,
  type Label,
  neighborLabelOffsets,
  OffsetNeighborLabelSchema,
  type ShadowLabel,
  ShadowLabelSchema,
} from "../labels";
import { assertNever, parses } from "../utils";
import { Dancer, type WorldState } from "../worldState";

export const InstructionIdSchema = z.string().uuid();
export type InstructionId = z.infer<typeof InstructionIdSchema>;

export const instructionBaseSchemaFields = {
  id: InstructionIdSchema,
  beats: BeatsSchema,
};

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

export function resolveLabel(
  id: DancerId,
  label: InfallibleLabel,
  protos: Record<ProtoId, Dancer>,
): DancerId;
export function resolveLabel(
  id: DancerId,
  label: Label,
  protos: Record<ProtoId, Dancer>,
): DancerId | undefined;
export function resolveLabel(
  id: DancerId,
  label: Label,
  protos: Record<ProtoId, Dancer>,
): DancerId | undefined {
  if (parses(InfallibleLabelSchema, label)) {
    switch (label) {
      case "partner":
      case "neighbor":
        return Dancer.get(id, protos).labels[label];
      case "opposite": {
        const neighbor = resolveLabel(id, "neighbor", protos);
        return resolveLabel(neighbor, "partner", protos);
      }
    }

    label satisfies z.infer<typeof OffsetNeighborLabelSchema>;
    const neighbor = resolveLabel(id, "neighbor", protos);
    return addOffsetToId(
      neighbor,
      neighborLabelOffsets[label] * getProgDirSign(id),
    );
  } else if (parses(ShadowLabelSchema, label)) {
    return Dancer.get(id, protos).labels[label];
  } else {
    const handLabel = label satisfies Exclude<
      Label,
      InfallibleLabel | ShadowLabel
    >;
    switch (handLabel) {
      case "person_in_left_hand":
        return Dancer.get(id, protos).hands["left"]?.theirId;
      case "person_in_right_hand":
        return Dancer.get(id, protos).hands["right"]?.theirId;
      default:
        assertNever(handLabel);
    }
  }
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

// Re-export direction and identifier types/functions so existing imports continue to work.
export {
  type CalledDirection,
  CalledDirectionSchema,
  type CardinalDirection,
  CardinalDirectionSchema,
  facesAcross,
  facesOut,
  findDancerInCalledDirection,
  type PureDirection,
  PureDirectionSchema,
  resolveCalledDirection,
  resolveCalledDirectionTarget,
  resolveCardinalDirection,
  resolvePureDirection,
  type TowardsLabelDirection,
  TowardsLabelDirectionSchema,
  type TowardsPersonDirection,
  TowardsPersonDirectionSchema,
} from "../directions";
export { resolveRings, resolveShortLines } from "../formations";
export {
  type CalledIdentifier,
  CalledIdentifierSchema,
  inferRoleOfCalledIdentifier,
  type PersonInDirection,
  PersonInDirectionSchema,
  resolveCalledIdentifier,
  resolveMatch,
  resolveMatches,
} from "../identifiers";
