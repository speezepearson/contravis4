import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { resolveShortLine } from "../formations";
import { PI, revolve, roughlySameDir } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { indexOf, must } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import { type ContraAnimation, instructionBaseSchemaFields } from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator } from "./_segment";

export const BendTheLineInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("bend_the_line"),
});
export type BendTheLineInstruction = z.infer<
  typeof BendTheLineInstructionSchema
>;

export function planBendTheLine(
  instr: BendTheLineInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const line = resolveShortLine(dancer);

  // Assert all dancers in the short line face approximately the same direction
  for (const d of line) {
    if (!roughlySameDir(d.facing, dancer.facing)) {
      throw new SnazzyError([
        "Dancers in short line for ",
        { dancerId: d.id },
        " are not all facing approximately the same direction",
      ]);
    }
  }

  const idx = must(
    indexOf(
      line.map((d) => d.protoId),
      dancer.protoId,
    ),
  );

  const startPos = dancer.pos;
  const startFacing = dancer.facing;

  // Left pair rotates CW, right pair rotates CCW
  const facingRadians = idx <= 1 ? -PI / 2 : PI / 2;

  // Compute position function based on index
  const positionFn: ((frac: number) => import("vecti").Vector) | undefined =
    (() => {
      if (idx === 0) {
        // Left end: arc CW around neighbor
        const center = Dancer.get(line[1].id, dancer.worldState).pos;
        return (frac: number) =>
          revolve(startPos, { around: center, radians: (-PI / 2) * frac });
      } else if (idx === 3) {
        // Right end: arc CCW around neighbor
        const center = Dancer.get(line[2].id, dancer.worldState).pos;
        return (frac: number) =>
          revolve(startPos, { around: center, radians: (PI / 2) * frac });
      }
      return undefined;
    })();

  // Left pair (0,1) and right pair (2,3) bend together
  const partnerId = line[idx ^ 1].id;

  return [
    {
      dur: instr.beats,
      position: positionFn,
      facing: (frac) => startFacing.rotateByRadians(facingRadians * frac),
      interactedWith: () => [partnerId],
    },
  ];
}

export const bendTheLineSegments: InstructionAnimator<
  BendTheLineInstruction
> = (instr, init, who) => {
  const anim = animatePlans(init, who, (d) => planBendTheLine(instr, d));
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

export function bendTheLineAnimator(
  instr: BendTheLineInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planBendTheLine(instr, dancer));
}
