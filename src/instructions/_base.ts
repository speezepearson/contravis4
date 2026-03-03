import type { Vector } from "vecti";
import { z } from "zod";

import {
  addOffsetToId,
  ALL_PROTO_IDS,
  type Beats,
  BeatsSchema,
  type DancerId,
  getRole,
  isLark,
  type ProtoId,
  protoIdToDancerId,
} from "../contraCore";
import { EAST, getDir, NORTH, SOUTH, WEST } from "../geometry";
import { assertNever, parses } from "../utils";
import {
  BasicLabelSchema,
  type DancerState,
  getDancerState,
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

const DerivedLabelSchema = z.enum([
  "opposite",
  "next neighbor",
  "next x2 neighbor",
  "next x3 neighbor",
  "prev neighbor",
  "prev x2 neighbor",
  "prev x3 neighbor",
]);

export const CalledLabelSchema = z.enum([
  ...BasicLabelSchema.options,
  ...DerivedLabelSchema.options,
]);
export type CalledLabel = z.infer<typeof CalledLabelSchema>;
export function resolveCalledLabel(
  label: CalledLabel,
  id: DancerId,
  protos: Record<ProtoId, DancerState>,
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
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, 1);
    }
    case "next x2 neighbor": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, 2);
    }
    case "next x3 neighbor": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, 3);
    }
    case "prev neighbor": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, -1);
    }
    case "prev x2 neighbor": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, -2);
    }
    case "prev x3 neighbor": {
      const neighbor = resolveBasicLabel("neighbor", id, protos);
      if (!neighbor) return null;
      return addOffsetToId(neighbor, -3);
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
  id: ProtoId,
  dir: CalledDirection,
  protos: Record<ProtoId, DancerState>,
): Vector {
  if (parses(CalledLabelSchema, dir)) {
    const themId = resolveCalledLabel(dir, id, protos);
    if (!themId) throw new Error(`${id} has no ${dir}`);
    return getDir({
      from: getDancerState(id, protos).pos,
      to: getDancerState(themId, protos).pos,
    });
  }
  switch (dir) {
    case "on_right":
      return protos[id].facing.rotateByDegrees(-90);
    case "on_left":
      return protos[id].facing.rotateByDegrees(90);
    case "in_front":
      return protos[id].facing;
    case "behind":
      return protos[id].facing.multiply(-1);
    case "left_diagonal":
      return protos[id].facing.rotateByDegrees(45);
    case "right_diagonal":
      return protos[id].facing.rotateByDegrees(-45);
    case "larks_left_robins_right":
      return protos[id].facing.rotateByDegrees(45 * (isLark(id) ? 1 : -1));
    case "larks_right_robins_left":
      return protos[id].facing.rotateByDegrees(-45 * (isLark(id) ? 1 : -1));
    case "across":
      return protos[id].pos.x < 0 ? EAST : WEST;
    case "out":
      return protos[id].pos.x < 0 ? WEST : EAST;
    case "up":
      return NORTH;
    case "down":
      return SOUTH;
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
  id: ProtoId,
  cid: CalledIdentifier,
  protos: Record<ProtoId, DancerState>,
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

export function findDancerInDirection(
  protos: Record<ProtoId, DancerState>,
  id: ProtoId,
  dir: Vector,
  { roles }: { roles?: "same" | "different" } = {},
): DancerId | null {
  dir = dir.normalize();
  const pos = protos[id].pos;

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
  dancers: Record<ProtoId, DancerState>,
  { roles }: { roles?: "same" | "different" } = {},
): DancerId | null {
  const dir = resolveCalledDirection(id, side, dancers);
  return findDancerInDirection(dancers, id, dir, { roles });
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
