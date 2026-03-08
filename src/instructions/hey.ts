import { Vector } from "vecti";
import { z } from "zod";

import {
  ALL_PROTO_IDS,
  type DancerId,
  HandSchema,
  RoleSchema,
} from "../contraCore";
import { getGroupOfFour } from "../formations";
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
  const groups = Object.fromEntries(
    ALL_PROTO_IDS.map((id) => {
      const d = Dancer.get(id, init);
      return [id, getGroupOfFour(d)] as const;
    }),
  );

  const mainSegment: ReturnType<InstructionAnimator<HeyInstruction>>[number] = {
    dur: instr.beats,
    position: linearTo((dancer) => {
      const group = groups[dancer.protoId];
      const side = getDancerSide(dancer);
      if (instr.full) {
        // Full hey: end on the same side, same y
        const x = side === "west" ? -0.5 : 0.5;
        return new Vector(x, dancer.pos.y);
      } else {
        // Half hey: end on the opposite side, at the y of the other
        // dancer with the same role in the group
        const sameRoleOther = group.find(
          (g) => g.role === dancer.role && g.id !== dancer.id,
        )!;
        const x = side === "west" ? 0.5 : -0.5;
        return new Vector(x, sameRoleOther.pos.y);
      }
    }),
    hands: () => ({}),
    interactedWith: (dancer): DancerId[] => {
      const group = groups[dancer.protoId];
      return group.filter((g) => g.id !== dancer.id).map((g) => g.id);
    },
  };

  return fudgeToAlignY(
    fudgeToSpaceEvenlyInY([mainSegment], init, who),
    init,
    who,
  );
};
