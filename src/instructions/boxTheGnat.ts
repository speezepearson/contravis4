import { z } from "zod";

import { getDir, PI } from "../geometry";
import { getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatch,
} from "./_base";
import { arc, hold, lerpFacingTo, type SegmentAnimator } from "./_segment";

export const BoxTheGnatInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("box_the_gnat"),
  cid: CalledIdentifierSchema,
});
export type BoxTheGnatInstruction = z.infer<typeof BoxTheGnatInstructionSchema>;

export const boxTheGnatSegments =
  (instr: BoxTheGnatInstruction): SegmentAnimator =>
  () => [
    {
      dur: instr.beats,
      position: arc(instr.cid, { semiMinor: 0.25, phi: PI }),
      facing: lerpFacingTo((id, segInit) => {
        const them = resolveMatch(id, instr.cid, segInit);
        return getDir({
          from: getDancerState(them, segInit).pos,
          to: segInit[id].pos,
        });
      }),
      hands: (id, _frac, segInit) => {
        const them = resolveMatch(id, instr.cid, segInit);
        return hold(["right", them, "right"]);
      },
    },
  ];
