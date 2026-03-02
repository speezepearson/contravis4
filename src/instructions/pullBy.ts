import { z } from "zod";
import {
  RelationshipSchema,
  HandSchema,
  resolveRelationship,
} from "../contraCore";
import { instructionBaseSchemaFields, type InstructionAnimator } from "./_base";
import { produce } from "immer";
import { getDancerState, connectHands, buildProtoRecord } from "../worldState";
import { ellipsePosition } from "../geometry";

export const PullByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pull_by"),
  relationship: RelationshipSchema,
  hand: HandSchema,
});
export type PullByInstruction = z.infer<typeof PullByInstructionSchema>;

export const pullByAnimator: InstructionAnimator<PullByInstruction> = (
  init,
  who,
  instr,
) => {
  const semiMinorCw = (1 / 2) * { left: -1, right: 1 }[instr.hand];
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
      const progressFrac = t / instr.beats;
      return produce(init, (draft) => {
        draft.beat += t;
        for (const id of who) {
          const arc = plans[id];
          draft.protos[id].pos = ellipsePosition(
            arc.start,
            arc.end,
            semiMinorCw,
            Math.PI * progressFrac,
          );
          draft.protos[id].facing = arc.end.subtract(arc.start).normalize();
          if (progressFrac < 0.5)
            connectHands(draft, id, instr.hand, instr.relationship, instr.hand);
        }
      });
    },
  };
};
