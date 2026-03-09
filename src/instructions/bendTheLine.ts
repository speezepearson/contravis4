import { z } from "zod";

import { resolveShortLine } from "../formations";
import { PI, revolve, roughlySameDir } from "../geometry";
import { SnazzyError } from "../snazzyError";
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
  const orig = (d: Dancer) => d.at(init);

  const getInitLine = (dancer: Dancer) => resolveShortLine(orig(dancer));

  const ensureAllFacingSameWay = (dancer: Dancer) => {
    const line = getInitLine(dancer);

    // Assert all dancers in each short line face approximately the same direction
    for (const d of line) {
      if (!roughlySameDir(d.facing, dancer.facing)) {
        throw new SnazzyError([
          "Dancers in short line for ",
          { dancerId: d.id },
          " are not all facing approximately the same direction",
        ]);
      }
    }
  };

  return [
    {
      dur: instr.beats,
      position: (dancer, frac) => {
        ensureAllFacingSameWay(dancer);
        const line = getInitLine(dancer);
        const idx = must(
          indexOf(
            line.map((d) => d.protoId),
            dancer.protoId,
          ),
        );
        if (idx === 0) {
          // Left end: arc CW around neighbor
          const center = Dancer.get(line[1].id, dancer.worldState).pos;
          return revolve(dancer.pos, {
            around: center,
            radians: (-PI / 2) * frac,
          });
        } else if (idx === 3) {
          // Right end: arc CCW around neighbor
          const center = Dancer.get(line[2].id, dancer.worldState).pos;
          return revolve(dancer.pos, {
            around: center,
            radians: (PI / 2) * frac,
          });
        }
        return dancer.pos;
      },
      facing: (dancer, frac) => {
        const line = getInitLine(dancer);
        const idx = must(
          indexOf(
            line.map((d) => d.protoId),
            dancer.protoId,
          ),
        );
        // Left pair rotates CW, right pair rotates CCW
        const radians = idx <= 1 ? -PI / 2 : PI / 2;
        return dancer.facing.rotateByRadians(radians * frac);
      },
      interactedWith: (dancer) => {
        const line = getInitLine(dancer);
        const idx = must(
          indexOf(
            line.map((d) => d.protoId),
            dancer.protoId,
          ),
        );
        // Left pair (0,1) and right pair (2,3) bend together
        return [line[idx ^ 1].id];
      },
    },
  ];
};
