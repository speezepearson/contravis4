import { z } from "zod";
import { instructionBaseSchemaFields, type InstructionAnimator } from "./_base";
import {
  otherHand,
  parseProtoId,
  resolveRelationship,
  type Hand,
} from "../contraCore";
import { produce } from "immer";
import { getDancerState, connectHands, buildProtoRecord } from "../worldState";
import { ellipsePosition, getDir, lerpFacing } from "../geometry";

export const CaliforniaTwirlInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("california_twirl"),
});
export type CaliforniaTwirlInstruction = z.infer<
  typeof CaliforniaTwirlInstructionSchema
>;

export const californiaTwirlAnimator: InstructionAnimator<
  CaliforniaTwirlInstruction
> = (init, who, instr) => {
  const plans = buildProtoRecord((id) => {
    const myRole = parseProtoId(id).role;
    const myHands = init.protos[id].hands;
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

    const myPos = init.protos[id].pos;
    const theirPos = getDancerState(them, init.protos).pos;
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
        draft.beat += t;
        const progressFrac = t / instr.beats;
        for (const id of who) {
          const plan = plans[id];
          draft.protos[id].pos = ellipsePosition(
            plan.start,
            plan.end,
            1 / 2,
            Math.PI * progressFrac,
          );
          draft.protos[id].facing = lerpFacing(
            init.protos[id].facing,
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
