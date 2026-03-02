import { produce } from "immer";
import { z } from "zod";

import {
  type Hand,
  otherHand,
  parseProtoId,
  resolveRelationship,
} from "../contraCore";
import { ellipsePosition, getDir, lerpFacing } from "../geometry";
import { buildProtoRecord, connectHands, getDancerState } from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";

export const CaliforniaTwirlInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("california_twirl"),
});
export type CaliforniaTwirlInstruction = z.infer<
  typeof CaliforniaTwirlInstructionSchema
>;

export const californiaTwirlAnimator =
  (instr: CaliforniaTwirlInstruction): Animator =>
  (init, who) => {
    const plans = buildProtoRecord((id) => {
      const myRole = parseProtoId(id).role;
      const myHands = init[id].hands;
      const twirlHand: Hand = myRole === "robin" ? "left" : "right";
      if (!myHands[twirlHand])
        throw new Error(
          `Dancer ${id} has nobody in their hand to California twirl with`,
        );
      if (myHands[otherHand(twirlHand)])
        throw new Error(
          `Dancer ${id} has to drop their other hand before California twirling`,
        );

      const relationship = myHands[twirlHand][0];
      const them = resolveRelationship(id, relationship);

      const myPos = init[id].pos;
      const theirPos = getDancerState(them, init).pos;
      return {
        start: myPos,
        end: theirPos,
        endFacing: getDir({ from: myPos, to: theirPos }).rotateByDegrees(
          90 * (myRole === "lark" ? 1 : -1),
        ),
        twirlHand,
        relationship,
      };
    });
    return {
      dur: instr.beats,
      getFrame(t) {
        return produce(init, (draft) => {
          const progressFrac = t / instr.beats;
          for (const id of who) {
            const plan = plans[id];
            draft[id].pos = ellipsePosition(
              plan.start,
              plan.end,
              0.25,
              Math.PI * progressFrac,
            );
            draft[id].facing = lerpFacing(
              init[id].facing,
              plan.endFacing,
              progressFrac,
            );
            connectHands(
              draft,
              id,
              plan.twirlHand,
              plan.relationship,
              otherHand(plan.twirlHand),
            );
          }
        });
      },
    };
  };
