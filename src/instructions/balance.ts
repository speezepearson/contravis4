import { z } from "zod";

import { must } from "../utils";
import { getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { linearTo, type SegmentAnimator } from "./_segment";

export const BalanceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("balance"),
  cid: CalledIdentifierSchema,
});
export type BalanceInstruction = z.infer<typeof BalanceInstructionSchema>;

export const balanceSegments =
  (instr: BalanceInstruction): SegmentAnimator =>
  (init) => {
    const halfBeats = instr.beats / 2;
    return [
      {
        dur: halfBeats,
        position: linearTo((id, segInit) => {
          const them = must(resolveCalledIdentifier(id, instr.cid, segInit));
          const theirPos = getDancerState(them, segInit).pos;
          return segInit[id].pos.multiply(2).add(theirPos).divide(3);
        }),
      },
      {
        dur: halfBeats,
        position: linearTo((id) => init[id].pos),
      },
    ];
  };
