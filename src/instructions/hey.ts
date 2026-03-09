import { Vector } from "vecti";
import { z } from "zod";

import { type DancerId, HandSchema, RoleSchema } from "../contraCore";
import {
  getGroupOfFour,
  preferCloser,
  preferOneInFront,
  preferRecent,
} from "../formations";
import { getSingleton, must } from "../utils";
import { Dancer, getDancerSide } from "../worldState";
import { instructionBaseSchemaFields } from "./_base";
import { fudgeToAlignY, fudgeToSpaceEvenlyInY } from "./_fudge";
import { type InstructionAnimator, linearTo } from "./_segment";

export const HeyInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("hey"),
  full: z.boolean(),
  centerRole: RoleSchema,
  centerHand: HandSchema,
});
export type HeyInstruction = z.infer<typeof HeyInstructionSchema>;

export const heySegments: InstructionAnimator<HeyInstruction> = (
  instr,
  init,
  who,
) => {
  if (who.size !== 4) throw new Error("hey requires all 4 dancers");

  // Pre-compute groups for each dancer
  const getInitGroup = (dancer: Dancer) =>
    getGroupOfFour(dancer.at(init), {
      by: [preferCloser, preferOneInFront, preferRecent],
    });

  const mainSegment: ReturnType<InstructionAnimator<HeyInstruction>>[number] = {
    dur: instr.beats,
    position: linearTo((dancer) => {
      const group = getInitGroup(dancer);
      const side = getDancerSide(dancer);
      if (instr.full) {
        // Full hey: end on the same side, same y
        const x = side === "west" ? -0.5 : 0.5;
        return new Vector(x, dancer.pos.y);
      } else {
        // Half hey: end on the opposite side, at the y of the other
        // dancer with the same role in the group
        const sameRoleOther = must(
          getSingleton(
            group.filter((d) => d.role === dancer.role && d.dir !== dancer.dir),
          ),
        );
        const x = side === "west" ? 0.5 : -0.5;
        return new Vector(x, sameRoleOther.pos.y);
      }
    }),
    hands: () => ({}),
    interactedWith: (dancer): DancerId[] => {
      const group = getInitGroup(dancer);
      return group.filter((d) => d.id !== dancer.id).map((d) => d.id);
    },
  };

  return fudgeToAlignY(
    fudgeToSpaceEvenlyInY([mainSegment], init, who),
    init,
    who,
  );
};
