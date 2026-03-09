import { Vector } from "vecti";
import { z } from "zod";

import {
  type Beats,
  BeatsSchema,
  type DancerId,
  type ProtoId,
} from "../contraCore";
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

export function avgDancerPos(dancers: DancerId[], state: WorldState): Vector {
  let sum = new Vector(0, 0);
  for (const id of dancers) {
    sum = sum.add(Dancer.get(id, state).pos);
  }
  return sum.divide(dancers.length);
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
  type PureDirection,
  PureDirectionSchema,
  resolveCardinalDirection,
  type TowardsLabelDirection,
  TowardsLabelDirectionSchema,
  type TowardsPersonDirection,
  TowardsPersonDirectionSchema,
} from "../directions";
export { getGroupOfFour, resolveRing, resolveShortLine } from "../formations";
export {
  type CalledIdentifier,
  CalledIdentifierSchema,
  inferRoleOfCalledIdentifier,
  type PersonInDirection,
  PersonInDirectionSchema,
} from "../identifiers";
export { resolveMatches } from "../worldState";
