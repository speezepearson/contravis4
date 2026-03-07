import { produce } from "immer";
import { z } from "zod";

import { ALL_PROTO_IDS } from "../contraCore";
import { ccwRadsBetween, getDir } from "../geometry";
import { must } from "../utils";
import {
  buildProtoRecord,
  connectHands,
  Dancer,
  type WorldState,
} from "../worldState";
import { instructionBaseSchemaFields, resolveRings } from "./_base";
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
  const targets = buildProtoRecord((id) => {
    const d = Dancer.get(id, init);
    const acrossId = must(
      d.resolveCalledIdentifier("person_across", {
        roles: "different",
      }),
    );
    const alongCid =
      init[id].facing.y >= 0 ? "person_up" : ("person_down" as const);
    const alongId = must(
      d.resolveCalledIdentifier(alongCid, { roles: "different" }),
    );
    return { acrossId, alongId };
  });

  const final = produce(init, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      const { acrossId, alongId } = targets[id];
      const dirToAcross = getDir({
        from: init[id].pos,
        to: Dancer.get(acrossId, init).pos,
      });
      const dirToAlong = getDir({
        from: init[id].pos,
        to: Dancer.get(alongId, init).pos,
      });
      draft[id].facing = dirToAcross.add(dirToAlong).normalize();

      const onRightId =
        ccwRadsBetween(draft[id].facing, dirToAlong) > 0 ? acrossId : alongId;

      connectHands(draft, id, "right", onRightId, "left");
    }
  });

  return {
    dur: 0,
    position: (dancer) => final[dancer.protoId].pos,
    facing: (dancer) => final[dancer.protoId].facing,
    hands: (dancer) => final[dancer.protoId].hands,
    interactedWith: (dancer) => [
      targets[dancer.protoId].acrossId,
      targets[dancer.protoId].alongId,
    ],
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
