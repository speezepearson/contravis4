import { z } from "zod";

import { ALL_PROTO_IDS, type DancerId } from "../contraCore";
import { PI, revolve } from "../geometry";
import { getDancerState } from "../worldState";
import { instructionBaseSchemaFields, resolveShortLines } from "./_base";
import { type InstructionAnimator } from "./_segment";

export const BendTheLineInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("bend_the_line"),
});
export type BendTheLineInstruction = z.infer<
  typeof BendTheLineInstructionSchema
>;

export const bendTheLineSegments: InstructionAnimator<
  BendTheLineInstruction
> = (instr, init) => {
  const shortLines = resolveShortLines(init);

  // Assert all dancers in each short line face approximately the same direction
  for (const protoId of ALL_PROTO_IDS) {
    const line = shortLines[protoId];
    const refFacing = getDancerState(line[0], init).facing;
    for (const dancerId of line) {
      if (getDancerState(dancerId, init).facing.dot(refFacing) < 0.7) {
        throw new Error(
          `Dancers in short line for ${protoId} are not all facing approximately the same direction`,
        );
      }
    }
  }

  return [
    {
      dur: instr.beats,
      position: (id, frac, segInit) => {
        const line = shortLines[id];
        const idx = line.indexOf(id as DancerId);
        if (idx === 0) {
          // Left end: arc CW around neighbor
          const center = getDancerState(line[1], segInit).pos;
          return revolve(segInit[id].pos, {
            around: center,
            radians: (-PI / 2) * frac,
          });
        } else if (idx === 3) {
          // Right end: arc CCW around neighbor
          const center = getDancerState(line[2], segInit).pos;
          return revolve(segInit[id].pos, {
            around: center,
            radians: (PI / 2) * frac,
          });
        }
        return segInit[id].pos;
      },
      facing: (id, frac, segInit) => {
        const line = shortLines[id];
        const idx = line.indexOf(id as DancerId);
        // Left pair rotates CW, right pair rotates CCW
        const radians = idx <= 1 ? -PI / 2 : PI / 2;
        return segInit[id].facing.rotateByRadians(radians * frac);
      },
    },
  ];
};
