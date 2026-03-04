import { z } from "zod";

import { HandSchema } from "../contraCore";
import { PI } from "../geometry";
import { getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatch,
} from "./_base";
import { arc, hold, type SegmentAnimator } from "./_segment";

export const PullByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pull_by"),
  cid: CalledIdentifierSchema,
  hand: HandSchema,
});
export type PullByInstruction = z.infer<typeof PullByInstructionSchema>;

export const pullBySegments =
  (instr: PullByInstruction): SegmentAnimator =>
  () => {
    const semiMinor = 0.25 * { left: -1, right: 1 }[instr.hand];
    return [
      {
        dur: instr.beats,
        position: arc(instr.cid, { semiMinor, phi: PI }),
        facing: (id, _frac, segInit) => {
          const them = resolveMatch(id, instr.cid, segInit);
          return getDancerState(them, segInit)
            .pos.subtract(segInit[id].pos)
            .normalize();
        },
        hands: (id, frac, segInit) => {
          if (frac >= 0.5) return {};
          const them = resolveMatch(id, instr.cid, segInit);
          return hold([instr.hand, them, instr.hand]);
        },
      },
    ];
  };
