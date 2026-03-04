import { z } from "zod";

import { ccwRadsBetween, getDir } from "../geometry";
import { must } from "../utils";
import {
  buildProtoRecord,
  connectHands,
  getDancerState,
  type WorldState,
} from "../worldState";
import {
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
  resolveRings,
} from "./_base";
import {
  evaluateSegmentEnd,
  makeImmediateSegment,
  type Segment,
  type SegmentAnimator,
} from "./_segment";

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

  return makeImmediateSegment(init, (id, draft) => {
    const { acrossId, alongId } = targets[id];
    const dirToAcross = getDir({
      from: init[id].pos,
      to: getDancerState(acrossId, init).pos,
    });
    const dirToAlong = getDir({
      from: init[id].pos,
      to: getDancerState(alongId, init).pos,
    });
    draft[id].facing = dirToAcross.add(dirToAlong).normalize();

    const onRightId =
      ccwRadsBetween(draft[id].facing, dirToAlong) > 0 ? acrossId : alongId;

    connectHands(draft, id, "right", onRightId, "left");
  });
}

export const takeHandsInRingsSegments =
  (_instr: TakeHandsInRingsInstruction): SegmentAnimator =>
  (init, who) => {
    const segment = makeRingSegment(init);
    const endState = evaluateSegmentEnd(segment, init, who);
    resolveRings(endState);
    return [segment];
  };
