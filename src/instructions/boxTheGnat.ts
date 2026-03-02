import { z } from "zod";
import { FoilRelationshipSchema, resolveRelationship } from "../contraCore";
import { instructionBaseSchemaFields, type InstructionAnimator } from "./_base";
import { produce } from "immer";
import { getDancerState, connectHands, buildProtoRecord } from "../worldState";
import { ellipsePosition } from "../geometry";

export const BoxTheGnatInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("box_the_gnat"),
  relationship: FoilRelationshipSchema,
});
export type BoxTheGnatInstruction = z.infer<typeof BoxTheGnatInstructionSchema>;

export const boxTheGnatAnimator: InstructionAnimator<BoxTheGnatInstruction> = (
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
          connectHands(draft, id, "right", instr.relationship, "right");
        }
      });
    },
  };
};
