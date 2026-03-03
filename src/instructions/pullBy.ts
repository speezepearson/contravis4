import { z } from "zod";

import { HandSchema } from "../contraCore";
import { PI } from "../geometry";
import { connectHands, disconnectHands, getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatches,
} from "./_base";
import { arc, type SegmentAnimator } from "./_segment";

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
        hands: (id, frac, draft) => {
          if (frac < 0.5) {
            connectHands(draft, id, instr.hand, matches[id], instr.hand);
          } else {
            disconnectHands(draft, id);
          }
        },
      },
    ];
  };
