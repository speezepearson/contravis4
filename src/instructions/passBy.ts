import { produce } from "immer";
import { z } from "zod";

import {
  HandSchema,
  RelationshipSchema,
  resolveRelationship,
} from "../contraCore";
import { ellipsePosition, PI } from "../geometry";
import { disconnectHands, getDancerState } from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";

export const PassByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pass_by"),
  relationship: RelationshipSchema,
  hand: HandSchema,
});
export type PassByInstruction = z.infer<typeof PassByInstructionSchema>;

export const passByAnimator =
  (instr: PassByInstruction): Animator =>
  (init, who) => ({
    dur: instr.beats,
    getFrame(t) {
      return produce(init, (draft) => {
        const progressFrac = t / instr.beats;
        for (const id of who) {
          disconnectHands(draft, id);
          const me = getDancerState(id, init);
          const them = getDancerState(
            resolveRelationship(id, instr.relationship),
            init,
          );
          draft[id].pos = ellipsePosition(
            me.pos,
            them.pos,
            0.25,
            PI * progressFrac,
          );
          draft[id].facing = them.pos.subtract(me.pos).normalize();
        }
      });
    },
  });
