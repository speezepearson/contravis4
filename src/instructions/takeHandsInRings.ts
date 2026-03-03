import { z } from "zod";

import { type DancerId, type ProtoId } from "../contraCore";
import { getDir } from "../geometry";
import { must } from "../utils";
import {
  buildProtoRecord,
  connectHands,
  getDancerState,
  type WorldState,
} from "../worldState";
import { instructionBaseSchemaFields, resolveCalledIdentifier } from "./_base";
import {
  evaluateSegmentEnd,
  type Segment,
  type SegmentAnimator,
} from "./_segment";
import { resolveInsideHand } from "./takeHands";

export const TakeHandsInRingsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("take_hands_in_rings"),
  beats: z.literal(0),
});
export type TakeHandsInRingsInstruction = z.infer<
  typeof TakeHandsInRingsInstructionSchema
>;

/**
 * Build the 0-beat segment that forms rings of four.
 *
 * Each dancer identifies:
 *   (a) the opposite-role dancer across the set
 *   (b) the opposite-role dancer north or south (whichever is more like their facing)
 * Then turns to face halfway between those two, and takes inside hands with each.
 */
export function makeRingSegment(init: WorldState): Segment {
  const targets = buildProtoRecord((id) => {
    const acrossId = must(
      resolveCalledIdentifier(id, "across", init, { roles: "different" }),
    );
    const alongDir = init[id].facing.y >= 0 ? "up" : "down";
    const alongId = must(
      resolveCalledIdentifier(id, alongDir, init, { roles: "different" }),
    );
    return { acrossId, alongId };
  });

  return {
    dur: 0,
    facing: (id, _frac, segInit) => {
      const { acrossId, alongId } = targets[id];
      const dirToAcross = getDir({
        from: segInit[id].pos,
        to: getDancerState(acrossId, segInit).pos,
      });
      const dirToAlong = getDir({
        from: segInit[id].pos,
        to: getDancerState(alongId, segInit).pos,
      });
      return dirToAcross.add(dirToAlong).normalize();
    },
    hands: (id, _frac, draft) => {
      const { acrossId, alongId } = targets[id];

      const acrossState = getDancerState(acrossId, draft);
      const myHandToAcross = resolveInsideHand(draft[id], acrossState);
      const theirHandFromAcross = resolveInsideHand(acrossState, draft[id]);
      connectHands(draft, id, myHandToAcross, acrossId, theirHandFromAcross);

      const alongState = getDancerState(alongId, draft);
      const myHandToAlong = resolveInsideHand(draft[id], alongState);
      const theirHandFromAlong = resolveInsideHand(alongState, draft[id]);
      connectHands(draft, id, myHandToAlong, alongId, theirHandFromAlong);
    },
  };
}

/** Follow right-hand connections to discover each dancer's ring.
 *  Throws if any ring is not exactly 4 dancers. */
export function findRings(state: WorldState): Record<ProtoId, Set<DancerId>> {
  return buildProtoRecord((id) => {
    const { theirId: r } = must(getDancerState(id, state).hands.get("right"));
    const { theirId: rr } = must(getDancerState(r, state).hands.get("right"));
    const { theirId: rrr } = must(getDancerState(rr, state).hands.get("right"));
    const { theirId: rrrr } = must(
      getDancerState(rrr, state).hands.get("right"),
    );
    if (rrrr !== id) {
      throw new Error(
        `Ring starting at ${id} does not close after 4 steps (got ${rrrr})`,
      );
    }
    if (new Set([id, r, rr, rrr]).size !== 4) {
      throw new Error(
        `Ring starting at ${id} has duplicate members: ${[id, r, rr, rrr].join(", ")}`,
      );
    }
    return new Set<DancerId>([id, r, rr, rrr]);
  });
}

export const takeHandsInRingsSegments =
  (_instr: TakeHandsInRingsInstruction): SegmentAnimator =>
  (init, who) => {
    const segment = makeRingSegment(init);
    const endState = evaluateSegmentEnd(segment, init, who);
    findRings(endState);
    return [segment];
  };
