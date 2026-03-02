import { produce } from "immer";
import { z } from "zod";

import {
  HandSchema,
  RelationshipSchema,
  resolveRelationship,
} from "../contraCore";
import { ellipsePosition, PI } from "../geometry";
import { buildProtoRecord, getDancerState } from "../worldState";
import { type InstructionAnimator, instructionBaseSchemaFields } from "./_base";

export const PassByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pass_by"),
  relationship: RelationshipSchema,
  hand: HandSchema,
});
export type PassByInstruction = z.infer<typeof PassByInstructionSchema>;

export const passByAnimator: InstructionAnimator<PassByInstruction> = (
  init,
  who,
  instr,
) => {
  const plans = buildProtoRecord((id) => {
    const them = resolveRelationship(id, instr.relationship);
    return {
      start: getDancerState(id, init).pos,
      end: getDancerState(them, init).pos,
    };
  });
  return {
    dur: instr.beats,
    getFrame(t) {
      return produce(init, (draft) => {
        const progressFrac = t / instr.beats;
        for (const id of who) {
          const arc = plans[id];
          draft[id].pos = ellipsePosition(
            arc.start,
            arc.end,
            0.25,
            PI * progressFrac,
          );
          draft[id].facing = arc.end.subtract(arc.start).normalize();
        }
      });
    },
  };
};
