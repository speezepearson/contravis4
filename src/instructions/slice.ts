import { Vector } from "vecti";
import { z } from "zod";

import { HandSchema, isLark, type ProtoId } from "../contraCore";
import { roughlySameDir } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { lerpVectors, must } from "../utils";
import { connectHands, Dancer, getDancerSide } from "../worldState";
import {
  instructionBaseSchemaFields,
  resolveCardinalDirection,
  resolveMatches,
} from "./_base";
import { fudgeToAlignY } from "./_fudge";
import {
  advanceState,
  type InstructionAnimator,
  lerpFacingTo,
  makeImmediateSegment,
  type Segment,
} from "./_segment";

export const SliceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("slice"),
  direction: HandSchema,
});
export type SliceInstruction = z.infer<typeof SliceInstructionSchema>;

export const sliceSegments: InstructionAnimator<SliceInstruction> = (
  instr,
  init,
  who,
) => {
  // Pair up with cid = larks_right_robins_left
  const cid = "person_larks_right_robins_left" as const;

  // Assert all dancers face roughly across
  for (const id of who) {
    const across = must(resolveCardinalDirection("across", init[id].pos), [
      { dancerId: id },
      "is in the middle, can't tell which way is across",
    ]);
    if (!roughlySameDir(init[id].facing, across)) {
      throw new SnazzyError([{ dancerId: id }, " must face across for slice"]);
    }
  }

  // Immediate: snap facing to exactly across
  const faceAcross: Segment = {
    dur: 0,
    facing: (dancer) =>
      must(resolveCardinalDirection("across", dancer.pos), [
        { dancerId: dancer.protoId },
        "is in the middle, can't tell which way is across",
      ]),
  };

  // Immediate: take hands with person_larks_right_robins_left
  const matches = resolveMatches(cid, init);
  const takeHands: Segment = makeImmediateSegment(init, (id, draft) => {
    const them = matches[id];
    // Lark's match is to their right, robin's match is to their left
    const myHand = isLark(id) ? "right" : "left";
    const theirHand = isLark(id) ? "left" : "right";
    connectHands(draft, id, myHand, them.id, theirHand);
  });

  const setupSegs = [faceAcross, takeHands];
  const postSetup = advanceState(setupSegs, init, who);

  // Pre-compute each dancer's match, side, and target positions
  const midTargets = new Map<ProtoId, Vector>();
  const finalTargets = new Map<ProtoId, Vector>();

  for (const id of who) {
    const dancer = Dancer.get(id, postSetup);

    const side = getDancerSide(dancer);
    const initY = dancer.pos.y;

    // Determine y movement: if slicing left and on the west side, move +1 (up);
    // if slicing left and on the east side, move -1 (down); vice versa for right.
    const yDelta = (instr.direction === "left") === (side === "west") ? 1 : -1;

    const midX = side === "west" ? -0.3 : 0.3;
    const finalX = side === "west" ? -1 : 1;

    midTargets.set(id, new Vector(midX, initY + yDelta));
    finalTargets.set(id, new Vector(finalX, initY + yDelta));
  }

  const halfBeats = instr.beats / 2;

  const firstSegment: Segment = {
    dur: halfBeats,
    position: (dancer, frac) => {
      return lerpVectors(dancer.pos, midTargets.get(dancer.protoId)!, frac);
    },
    facing: lerpFacingTo((dancer) =>
      must(resolveCardinalDirection("across", dancer.pos), [
        { dancerId: dancer.protoId },
        "is in the middle, can't tell which way is across",
      ]),
    ),
  };

  const secondSegment: Segment = {
    dur: halfBeats,
    position: (dancer, frac) => {
      return lerpVectors(dancer.pos, finalTargets.get(dancer.protoId)!, frac);
    },
    facing: lerpFacingTo((dancer) =>
      must(resolveCardinalDirection("across", dancer.pos), [
        { dancerId: dancer.protoId },
        "is in the middle, can't tell which way is across",
      ]),
    ),
    hands: () => ({}),
  };

  return [
    ...setupSegs,
    ...fudgeToAlignY([firstSegment], postSetup, who),
    secondSegment,
  ];
};
