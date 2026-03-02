import { z } from "zod";
import {
  RelationshipSchema,
  HandSchema,
  resolveRelationship,
} from "../contraCore";
import { instructionBaseSchemaFields, type InstructionAnimator } from "./_base";
import { produce } from "immer";
import { ellipsePosition } from "../geometry";
import { buildProtoRecord, getDancerState } from "../worldState";

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
      start: getDancerState(id, init.protos).pos,
      end: getDancerState(them, init.protos).pos,
    };
  });
  return {
    dur: instr.beats,
    getFrame(t) {
      return produce(init, (draft) => {
        draft.beat += t;

        const progressFrac = t / instr.beats;
        for (const id of who) {
          const arc = plans[id];
          draft.protos[id].pos = ellipsePosition(
            arc.start,
            arc.end,
            1 / 2,
            Math.PI * progressFrac,
          );
          draft.protos[id].facing = arc.end.subtract(arc.start).normalize();
        }
      });
    },
  };
};
