import { z } from "zod";

import { HandSchema } from "../contraCore";
import { PI } from "../geometry";
import { getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatches,
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
  (init) => {
    const matches = resolveMatches(instr.cid, init);
    const semiMinor = 0.25 * { left: -1, right: 1 }[instr.hand];
    return [
      {
        dur: instr.beats,
        position: arc(instr.cid, { semiMinor, phi: PI }),
        facing: (id, _frac, segInit) => {
          return getDancerState(matches[id], segInit)
            .pos.subtract(segInit[id].pos)
            .normalize();
        },
        hands: (id, frac) =>
          frac < 0.5 ? hold([instr.hand, matches[id], instr.hand]) : {},
      },
    ];
  };
