import { z } from "zod";

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { lerpFacing, PI, revolve } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { lerpVectors } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  personInDir,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const BoxCirculateInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("box_circulate"),
});
export type BoxCirculateInstruction = z.infer<
  typeof BoxCirculateInstructionSchema
>;

export function planBoxCirculate(
  instr: BoxCirculateInstruction,
  dancer: Dancer,
  outFacers: ReadonlySet<ProtoId>,
): DancerSegment[] {
  const startPos = dancer.pos;
  const startFacing = dancer.facing;
  const isOutFacer = outFacers.has(dancer.protoId);

  if (isOutFacer) {
    const match = dancer.resolveCalledIdentifier(
      personInDir("on_right", "different"),
    );
    if (!match)
      throw new SnazzyError([
        { dancerId: dancer.protoId },
        " has nobody on their right to box circulate to",
      ]);
    const matchPos = match.pos;
    const targetFacing = startFacing.rotateByRadians(PI);

    return [
      {
        dur: instr.beats,
        position: (frac) =>
          revolve(startPos, {
            aroundMidpointWith: matchPos,
            radians: -PI * frac,
          }),
        facing: (frac) =>
          lerpFacing(startFacing, targetFacing, frac, { forceDir: "cw" }),
        hands: () => ({}),
      },
    ];
  } else {
    const match = dancer.resolveCalledIdentifier(
      personInDir("in_front", "different"),
    );
    if (!match)
      throw new SnazzyError([
        { dancerId: dancer.protoId },
        " has nobody in front to box circulate to",
      ]);
    const matchPos = match.pos;

    return [
      {
        dur: instr.beats,
        position: (frac) => lerpVectors(startPos, matchPos, frac),
        facing: (frac) =>
          lerpFacing(startFacing, startFacing, frac, { forceDir: "cw" }),
        hands: () => ({}),
      },
    ];
  }
}

export function boxCirculateAnimator(
  instr: BoxCirculateInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`boxCirculate instruction must target all dancers`);

  const outFacerSet = new Set<ProtoId>();
  for (const id of who) {
    if (Dancer.get(id, init).facesOut()) {
      outFacerSet.add(id);
    } else if (Dancer.get(id, init).facesAcross()) {
      // acrossFacer — ok
    } else {
      throw new SnazzyError([{ dancerId: id }, " is not facing out or across"]);
    }
  }
  if (!(outFacerSet.size === 2 && who.size - outFacerSet.size === 2)) {
    throw new Error(
      `boxCirculate requires two dancers to face out and two to face across`,
    );
  }

  return animatePlans(init, who, (dancer) =>
    planBoxCirculate(instr, dancer, outFacerSet),
  );
}
