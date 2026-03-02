import { produce } from "immer";
import { z } from "zod";

import {
  HandSchema,
  RelationshipSchema,
  resolveRelationship,
} from "../contraCore";
import { ellipsePosition, PI } from "../geometry";
import {
  buildProtoRecord,
  connectHands,
  disconnectHands,
  getDancerState,
} from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";

export const PullByInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("pull_by"),
  relationship: RelationshipSchema,
  hand: HandSchema,
});
export type PullByInstruction = z.infer<typeof PullByInstructionSchema>;

export const pullByAnimator =
  (instr: PullByInstruction): Animator =>
  (init, who) => {
    const semiMinorCw = 0.25 * { left: -1, right: 1 }[instr.hand];
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
        const progressFrac = t / instr.beats;
        return produce(init, (draft) => {
          for (const id of who) {
            const arc = plans[id];
            draft[id].pos = ellipsePosition(
              arc.start,
              arc.end,
              semiMinorCw,
              PI * progressFrac,
            );
            draft[id].facing = arc.end.subtract(arc.start).normalize();
            if (progressFrac < 0.5) {
              connectHands(
                draft,
                id,
                instr.hand,
                instr.relationship,
                instr.hand,
              );
            } else {
              disconnectHands(draft, id);
            }
          }
        });
      },
    };
  };
