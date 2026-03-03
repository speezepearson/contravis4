import { z } from "zod";

import {
  HandSchema,
  RelationshipSchema,
  resolveRelationship,
} from "../contraCore";
import { PI } from "../geometry";
import { getDancerState } from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";
import { arc, disconnect, makeAnimation } from "./_segment";

export const PassByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pass_by"),
  relationship: RelationshipSchema,
  hand: HandSchema,
});
export type PassByInstruction = z.infer<typeof PassByInstructionSchema>;

export const passByAnimator =
  (instr: PassByInstruction): Animator =>
  (init, who) =>
    makeAnimation(init, who, [
      {
        dur: instr.beats,
        position: arc(instr.relationship, { semiMinor: 0.25, phi: PI }),
        facing: (id, _frac, segInit) => {
          const them = resolveRelationship(id, instr.relationship);
          return getDancerState(them, segInit)
            .pos.subtract(segInit[id].pos)
            .normalize();
        },
        hands: disconnect(),
      },
    ]);
