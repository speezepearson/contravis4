import { Vector } from "vecti";
import { z } from "zod";

import { HandSchema, isLark } from "../contraCore";
import { roughlySameDir } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { lerpVectors, must } from "../utils";
import { connectHands, Dancer, getDancerSide } from "../worldState";
import {
  instructionBaseSchemaFields,
  personInDir,
  resolveCardinalDirection,
} from "./_base";
import { fudgeToAlignY, fudgeToSpaceEvenlyInY } from "./_fudge";
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
  const cid = personInDir("larks_right_robins_left", "different");

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
  const takeHands: Segment = makeImmediateSegment(init, (id, draft) => {
    const them = Dancer.get(id, init).resolveMatch(cid);
    // Lark's match is to their right, robin's match is to their left
    const myHand = isLark(id) ? "right" : "left";
    const theirHand = isLark(id) ? "left" : "right";
    connectHands(draft, id, myHand, them.id, theirHand);
  });

  const setupSegs = [faceAcross, takeHands];
  const postSetup = advanceState(setupSegs, init, who);

  const halfBeats = instr.beats / 2;

  const firstSegment: Segment = {
    dur: halfBeats,
    position: (dancer, frac) => {
      const side = getDancerSide(dancer);
      const yDelta =
        (instr.direction === "left") === (side === "west") ? 1 : -1;
      const midX = side === "west" ? -0.3 : 0.3;

      return lerpVectors(
        dancer.pos,
        new Vector(midX, dancer.pos.y + yDelta),
        frac,
      );
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
      const side = getDancerSide(dancer);
      const finalX = side === "west" ? -0.5 : 0.5;
      return lerpVectors(dancer.pos, new Vector(finalX, dancer.pos.y), frac);
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
    ...fudgeToAlignY(
      fudgeToSpaceEvenlyInY([firstSegment], postSetup, who),
      postSetup,
      who,
    ),
    secondSegment,
  ];
};
