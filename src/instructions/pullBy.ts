import { z } from "zod";

import { HandSchema } from "../contraCore";
import { PI } from "../geometry";
import { must } from "../utils";
import { getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { arc, holdUntil, type SegmentAnimator } from "./_segment";

export const PullByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pull_by"),
  cid: CalledIdentifierSchema,
  hand: HandSchema,
});
export type PullByInstruction = z.infer<typeof PullByInstructionSchema>;

export const pullBySegments =
  (instr: PullByInstruction): SegmentAnimator =>
  (_init, _who) => {
    const semiMinor = 0.25 * { left: -1, right: 1 }[instr.hand];
    return [
      {
        dur: instr.beats,
        position: arc(instr.cid, { semiMinor, phi: PI }),
        facing: (id, _frac, segInit) => {
          const them = must(resolveCalledIdentifier(id, instr.cid, segInit));
          return getDancerState(them, segInit)
            .pos.subtract(segInit[id].pos)
            .normalize();
        },
        hands: holdUntil(0.5, instr.hand, instr.cid, instr.hand),
      },
    ];
  };
