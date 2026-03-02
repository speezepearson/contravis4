import { produce } from "immer";
import { z } from "zod";

import { RelationshipSchema, resolveRelationship } from "../contraCore";
import { ellipsePosition, TWO_PI } from "../geometry";
import { getDancerState } from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";

export const DoSiDoInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("do_si_do"),
  relationship: RelationshipSchema,
  rotations: z.number(),
});
export type DoSiDoInstruction = z.infer<typeof DoSiDoInstructionSchema>;

export const doSiDoAnimator =
  (instr: DoSiDoInstruction): Animator =>
  (init, who) => {
    return {
      dur: instr.beats,
      getFrame(_t) {
        return produce(init, (draft) => {
          const progressFrac = _t / instr.beats;
          for (const id of who) {
            const them = resolveRelationship(id, instr.relationship);
            const myPos = getDancerState(id, init).pos;
            const theirPos = getDancerState(them, init).pos;
            draft[id].pos = ellipsePosition(
              myPos,
              theirPos,
              0.25,
              TWO_PI * instr.rotations * progressFrac,
            );
          }
        });
      },
    };
  };
