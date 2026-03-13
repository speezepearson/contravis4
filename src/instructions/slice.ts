import { produce } from "immer";
import { Vector } from "vecti";
import { z } from "zod";

import { HandSchema, isLark, type ProtoId } from "../contraCore";
import { lerpFacing, roughlySameDir } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { lerpVectors, must } from "../utils";
import {
  connectHands,
  Dancer,
  getDancerSide,
  type WorldState,
} from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  perRoleId,
  personInDir,
  resolveCardinalDirection,
} from "./_base";
import { fudgePlansToAlignY, fudgePlansToSpaceEvenlyInY } from "./_fudge";
import { animatePlans, type DancerSegment, type PlanGetter } from "./_plan";

export const SliceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("slice"),
  direction: HandSchema,
});
export type SliceInstruction = z.infer<typeof SliceInstructionSchema>;

export function sliceAnimator(
  instr: SliceInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const cid = perRoleId(
    personInDir("on_right", "different"),
    personInDir("on_left", "different"),
  );

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

  // Compute post-setup state: snap facing across and take hands
  const postSetup = produce(init, (draft) => {
    for (const pid of who) {
      draft[pid].facing = must(
        resolveCardinalDirection("across", draft[pid].pos),
        [{ dancerId: pid }, "is in the middle, can't tell which way is across"],
      );
      const them = Dancer.get(pid, init).resolveMatch(cid);
      const myHand = isLark(pid) ? "right" : "left";
      const theirHand = isLark(pid) ? "left" : "right";
      connectHands(draft, pid, myHand, them.id, theirHand);
    }
  });

  const halfBeats = instr.beats / 2;

  // First segment plan (relative to postSetup)
  const firstSegmentPlan: PlanGetter = (dancer) => {
    const side = getDancerSide(dancer);
    const yDelta = (instr.direction === "left") === (side === "west") ? 1 : -1;
    const midX = side === "west" ? -0.3 : 0.3;
    const targetPos = new Vector(midX, dancer.pos.y + yDelta);
    const targetFacing = must(resolveCardinalDirection("across", dancer.pos), [
      { dancerId: dancer.protoId },
      "is in the middle, can't tell which way is across",
    ]);

    return [
      {
        dur: halfBeats,
        position: (frac: number) => lerpVectors(dancer.pos, targetPos, frac),
        facing: (frac: number) => lerpFacing(dancer.facing, targetFacing, frac),
      },
    ];
  };

  // Apply fudges relative to postSetup state
  const fudgedFirstPlan = fudgePlansToAlignY(
    fudgePlansToSpaceEvenlyInY(firstSegmentPlan, postSetup),
    postSetup,
  );

  return animatePlans(init, who, (dancer) => {
    // Setup: snap facing and hands (dur=0)
    const setupSeg: DancerSegment = {
      dur: 0,
      facing: () => postSetup[dancer.protoId].facing,
      hands: () => postSetup[dancer.protoId].hands,
    };

    // Fudged first segment
    const firstSegs = fudgedFirstPlan(dancer);

    // Compute post-first-segment state for second segment
    const lastFirstSeg = firstSegs[firstSegs.length - 1];
    const postSetupDancer = Dancer.get(dancer.protoId, postSetup);
    const postFirstPos = lastFirstSeg.position
      ? lastFirstSeg.position(1)
      : postSetupDancer.pos;
    const postFirstFacing = lastFirstSeg.facing
      ? lastFirstSeg.facing(1)
      : postSetupDancer.facing;

    // Second segment: walk back to side
    const finalX = Math.sign(postFirstPos.x) * 0.5;
    const finalFacing = must(resolveCardinalDirection("across", postFirstPos), [
      { dancerId: dancer.protoId },
      "is in the middle, can't tell which way is across",
    ]);

    const secondSeg: DancerSegment = {
      dur: halfBeats,
      position: (frac: number) =>
        lerpVectors(postFirstPos, new Vector(finalX, postFirstPos.y), frac),
      facing: (frac: number) => lerpFacing(postFirstFacing, finalFacing, frac),
      hands: () => ({}),
    };

    return [setupSeg, ...firstSegs, secondSeg];
  });
}
