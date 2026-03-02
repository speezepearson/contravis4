import { produce } from "immer";
import { z } from "zod";

import { FoilRelationshipSchema, resolveRelationship } from "../contraCore";
import { ellipsePosition } from "../geometry";
import { buildProtoRecord, connectHands, getDancerState } from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";

export const BoxTheGnatInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("box_the_gnat"),
  relationship: FoilRelationshipSchema,
});
export type BoxTheGnatInstruction = z.infer<typeof BoxTheGnatInstructionSchema>;

export const boxTheGnatAnimator =
  (instr: BoxTheGnatInstruction): Animator =>
  (init, who) => {
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
              1 / 2,
              Math.PI * progressFrac,
            );
            draft[id].facing = arc.end.subtract(arc.start).normalize();
            connectHands(draft, id, "right", instr.relationship, "right");
          }
        });
      },
    };
  };
