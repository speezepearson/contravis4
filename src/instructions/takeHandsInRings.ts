import _ from "lodash";
import { z } from "zod";

import { preferCloser, preferOneInFront, preferRecent } from "../formations";
import { ccwRadsBetween, getDir } from "../geometry";
import { avgPos, Dancer, mapWorldState, type WorldState } from "../worldState";
import {
  getGroupOfFour,
  instructionBaseSchemaFields,
  resolveRings,
} from "./_base";
import {
  getSegmentFrameAtFrac,
  type InstructionAnimator,
  type Segment,
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
  const getGroup = _.memoize((dancer: Dancer) =>
    getGroupOfFour(dancer, {
      by: [preferCloser, preferOneInFront, preferRecent],
    }),
  );
  const final = mapWorldState(init, (dancer) => {
    const group = getGroup(dancer);
    const center = avgPos(...Object.values(group));
    dancer.facing = getDir({ from: dancer.pos, to: center });
    const [left, right] = _.sortBy(
      Object.values(group).filter((d) => d.role !== dancer.role),
      (d) =>
        ccwRadsBetween(dancer.facing, getDir({ from: dancer.pos, to: d.pos })),
    );
    dancer.hands = {
      left: { theirId: left.id, theirHand: "right" },
      right: { theirId: right.id, theirHand: "left" },
    };
  });

  return {
    dur: 0,
    position: (dancer) => final[dancer.protoId].pos,
    facing: (dancer) => final[dancer.protoId].facing,
    hands: (dancer) => final[dancer.protoId].hands,
    interactedWith: (dancer) =>
      Object.values(getGroup(dancer)).map((d) => d.id),
  };
}

export const takeHandsInRingsSegments: InstructionAnimator<
  TakeHandsInRingsInstruction
> = (_instr, init, who) => {
  const segment = makeRingSegment(init);
  const endState = getSegmentFrameAtFrac(segment, init, who, 1);
  resolveRings(endState);
  return [segment];
};
