import { z } from "zod";

import {
  HandSchema,
  RelationshipSchema,
  resolveRelationship,
} from "../contraCore";
import { PI } from "../geometry";
import { getDancerState } from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";
import { arc, holdUntil, makeAnimation } from "./_segment";

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
    const semiMinor = 0.25 * { left: -1, right: 1 }[instr.hand];
    return makeAnimation(init, who, [
      {
        dur: instr.beats,
        position: arc(instr.relationship, { semiMinor, phi: PI }),
        facing: (id, _frac, segInit) => {
          const them = resolveRelationship(id, instr.relationship);
          return getDancerState(them, segInit).pos
            .subtract(segInit[id].pos)
            .normalize();
        },
        hands: holdUntil(
          0.5,
          instr.hand,
          instr.relationship,
          instr.hand,
        ),
      },
    ]);
  };
