import { z } from "zod";

import { HandSchema } from "../contraCore";
import { PI } from "../geometry";
import { Dancer } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatch,
} from "./_base";
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
        const them = resolveMatch(dancer, instr.cid);
        return Dancer.get(them, dancer.state)
          .pos.subtract(dancer.pos)
          .normalize();
      },
      hands: (dancer, frac) => {
        if (frac >= 0.5) return {};
        const them = resolveMatch(dancer, instr.cid);
        return hold([instr.hand, them, instr.hand]);
      },
      interactedWith: (dancer) => [resolveMatch(dancer, instr.cid)],
    },
  ];
};
