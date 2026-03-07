import { z } from "zod";

import { getDir, PI } from "../geometry";
import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";
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
    facing: lerpFacingTo((dancer) => {
      const them = dancer.resolveMatch(instr.cid);
      return getDir({
        from: them.pos,
        to: dancer.pos,
      });
    }),
    hands: (dancer) => {
      const them = dancer.resolveMatch(instr.cid);
      return hold(["right", them.id, "right"]);
    },
    interactedWith: (dancer) => [dancer.resolveMatch(instr.cid).id],
  },
];
