import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { ccwRadsBetween, ellipsePosition, getDir, PI } from "../geometry";
import { Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  perRoleId,
  personInDir,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator } from "./_segment";

export const CaliforniaTwirlInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("california_twirl"),
});
export type CaliforniaTwirlInstruction = z.infer<
  typeof CaliforniaTwirlInstructionSchema
>;

const matchCid = perRoleId(
  personInDir("on_right", "different"),
  personInDir("on_left", "different"),
);

export function planCaliforniaTwirl(
  instr: CaliforniaTwirlInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const them = dancer.resolveMatch(matchCid);
  const startPos = dancer.pos;
  const themPos = them.pos;
  const startFacing = dancer.facing;
  const isLark = dancer.isLark();

  // Target facing: from me toward them, rotated 90 degrees
  const targetFacing = getDir({
    from: startPos,
    to: themPos,
  }).rotateByDegrees(90 * (isLark ? -1 : 1));

  // Replicate lerpFacing with forceDir
  // TODO: this loses the robin's rotation. We shouldn't be lerping facing, we should .rotateByRadians() a lerped value. Or add some kind of helper for it.
  const ccw = ccwRadsBetween(startFacing, targetFacing);
  const dir = isLark ? "cw" : "ccw";
  const totalRadians =
    dir === "ccw"
      ? ccw > 0
        ? ccw
        : ccw + 2 * PI
      : ccw < 0
        ? ccw
        : ccw - 2 * PI;

  return [
    {
      dur: instr.beats,
      position: (frac) => ellipsePosition(startPos, themPos, 0.25, PI * frac),
      facing: (frac) => startFacing.rotateByRadians(totalRadians * frac),
      hands: () =>
        isLark
          ? {
              left: undefined,
              right: { theirId: them.id, theirHand: "left" },
            }
          : {
              left: { theirId: them.id, theirHand: "right" },
              right: undefined,
            },
      interactedWith: () => [them.id],
    },
  ];
}

export const californiaTwirlSegments: InstructionAnimator<
  CaliforniaTwirlInstruction
> = (instr, init, who) => {
  const anim = animatePlans(init, who, (d) => planCaliforniaTwirl(instr, d));
  return [
    {
      dur: instr.beats,
      position: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).pos,
      facing: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).facing,
      hands: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).hands,
      interactedWith: (dancer) => dancer.at(anim.getFrame(instr.beats)).recents,
    },
  ];
};

export function californiaTwirlAnimator(
  instr: CaliforniaTwirlInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) =>
    planCaliforniaTwirl(instr, dancer),
  );
}
