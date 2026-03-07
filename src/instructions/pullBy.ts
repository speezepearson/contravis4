import { z } from "zod";

import { HandSchema } from "../contraCore";
import { PI } from "../geometry";
import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";
import { arc, hold, type InstructionAnimator } from "./_segment";

export const PullByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pull_by"),
  cid: CalledIdentifierSchema,
  hand: HandSchema,
});
export type PullByInstruction = z.infer<typeof PullByInstructionSchema>;

export const pullBySegments: InstructionAnimator<PullByInstruction> = (
  instr,
) => {
  const semiMinor = 0.25 * { left: -1, right: 1 }[instr.hand];
  return [
    {
      dur: instr.beats,
      position: arc(instr.cid, { semiMinor, phi: PI }),
      facing: (dancer, _frac) => {
        const them = dancer.resolveMatch(instr.cid);
        return them.pos.subtract(dancer.pos).normalize();
      },
      hands: (dancer, frac) => {
        if (frac >= 0.5) return {};
        const them = dancer.resolveMatch(instr.cid);
        return hold([instr.hand, them.id, instr.hand]);
      },
      interactedWith: (dancer) => [dancer.resolveMatch(instr.cid).id],
    },
  ];
};
