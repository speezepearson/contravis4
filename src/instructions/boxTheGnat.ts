import { z } from "zod";

import { getDir, PI } from "../geometry";
import { getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatches,
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
  init,
) => {
  const matches = resolveMatches(instr.cid, init);
  return [
    {
      dur: instr.beats,
      position: arc(instr.cid, { semiMinor: 0.25, phi: PI }),
      facing: lerpFacingTo((id, segInit) => {
        return getDir({
          from: getDancerState(matches[id], segInit).pos,
          to: segInit[id].pos,
        });
      }),
      hands: (id) => hold(["right", matches[id], "right"]),
    },
  ];
};
