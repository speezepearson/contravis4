import { z } from "zod";

import { getDir, PI } from "../geometry";
import { getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatch,
} from "./_base";
import { arc, hold, type InstructionAnimator, lerpFacingTo } from "./_segment";

export const BoxTheGnatInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("box_the_gnat"),
  cid: CalledIdentifierSchema,
});
export type BoxTheGnatInstruction = z.infer<typeof BoxTheGnatInstructionSchema>;

export const boxTheGnatSegments: InstructionAnimator<BoxTheGnatInstruction> = (
  instr,
) => [
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
    interactedWith: (id, segInit) => [resolveMatch(id, instr.cid, segInit)],
  },
];
