import { z } from "zod";

import { ALL_PROTO_IDS, type DancerId } from "../contraCore";
import { resolveShortLines } from "../formations";
import { PI, revolve } from "../geometry";
import { indexOf, must } from "../utils";
import { Dancer } from "../worldState";
import { instructionBaseSchemaFields } from "./_base";
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
    const refFacing = Dancer.get(line[0], init).facing;
    for (const dancerId of line) {
      if (Dancer.get(dancerId, init).facing.dot(refFacing) < 0.7) {
        throw new Error(
          `Dancers in short line for ${protoId} are not all facing approximately the same direction`,
        );
      }
    }
  }

  return [
    {
      dur: instr.beats,
      position: (dancer, frac) => {
        const line = shortLines[dancer.protoId];
        const idx = must(indexOf(line, dancer.protoId as DancerId));
        if (idx === 0) {
          // Left end: arc CW around neighbor
          const center = Dancer.get(line[1], dancer.state).pos;
          return revolve(dancer.pos, {
            around: center,
            radians: (-PI / 2) * frac,
          });
        } else if (idx === 3) {
          // Right end: arc CCW around neighbor
          const center = Dancer.get(line[2], dancer.state).pos;
          return revolve(dancer.pos, {
            around: center,
            radians: (PI / 2) * frac,
          });
        }
        return dancer.pos;
      },
      facing: (dancer, frac) => {
        const line = shortLines[dancer.protoId];
        const idx = must(indexOf(line, dancer.protoId));
        // Left pair rotates CW, right pair rotates CCW
        const radians = idx <= 1 ? -PI / 2 : PI / 2;
        return dancer.facing.rotateByRadians(radians * frac);
      },
      interactedWith: (dancer) => {
        const line = shortLines[dancer.protoId];
        const idx = must(indexOf(line, dancer.protoId));
        // Left pair (0,1) and right pair (2,3) bend together
        return [line[idx ^ 1]];
      },
    },
  ];
};
