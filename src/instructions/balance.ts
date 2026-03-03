import { z } from "zod";

import { RelationshipSchema, resolveRelationship } from "../contraCore";
import { getDancerState } from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";
import { linearTo, makeAnimation } from "./_segment";

export const BalanceInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("balance"),
  relationship: RelationshipSchema,
});
export type BalanceInstruction = z.infer<typeof BalanceInstructionSchema>;

export const balanceAnimator =
  (instr: BalanceInstruction): Animator =>
  (init, who) => {
    const halfBeats = instr.beats / 2;

    return makeAnimation(init, who, [
      {
        dur: halfBeats,
        position: linearTo((id, segInit) => {
          const them = resolveRelationship(id, instr.relationship);
          const theirPos = getDancerState(them, segInit).pos;
          return segInit[id].pos.multiply(2).add(theirPos).divide(3);
        }),
      },
      {
        dur: halfBeats,
        position: linearTo((id) => init[id].pos),
      },
    ]);
  };
