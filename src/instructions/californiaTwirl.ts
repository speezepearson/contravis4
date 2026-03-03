import { z } from "zod";

import {
  FoilRelationshipSchema,
  otherHand,
  parseProtoId,
  resolveRelationship,
} from "../contraCore";
import { getDir, PI } from "../geometry";
import { connectHands, getDancerState } from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";
import { arc, lerpFacingTo, makeAnimation } from "./_segment";

export const CaliforniaTwirlInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("california_twirl"),
  relationship: FoilRelationshipSchema,
});
export type CaliforniaTwirlInstruction = z.infer<
  typeof CaliforniaTwirlInstructionSchema
>;

export const californiaTwirlAnimator =
  (instr: CaliforniaTwirlInstruction): Animator =>
  (init, who) =>
    makeAnimation(init, who, [
      {
        dur: instr.beats,
        position: arc(instr.relationship, { semiMinor: 0.25, phi: PI }),
        facing: lerpFacingTo((id, segInit) => {
          const myRole = parseProtoId(id).role;
          const them = resolveRelationship(id, instr.relationship);
          return getDir({
            from: segInit[id].pos,
            to: getDancerState(them, segInit).pos,
          }).rotateByDegrees(90 * (myRole === "lark" ? 1 : -1));
        }),
        hands: (id, _frac, draft) => {
          const twirlHand =
            parseProtoId(id).role === "robin" ? "left" : "right";
          connectHands(
            draft,
            id,
            twirlHand,
            instr.relationship,
            otherHand(twirlHand),
          );
        },
      },
    ]);
