import { z } from "zod";

import { isLark, otherHand, parseProtoId } from "../contraCore";
import { getDir, PI } from "../geometry";
import { must } from "../utils";
import { connectHands, getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCalledIdentifier,
} from "./_base";
import { arc, lerpFacingTo, type SegmentAnimator } from "./_segment";

export const CaliforniaTwirlInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("california_twirl"),
  cid: CalledIdentifierSchema,
});
export type CaliforniaTwirlInstruction = z.infer<
  typeof CaliforniaTwirlInstructionSchema
>;

export const californiaTwirlSegments =
  (instr: CaliforniaTwirlInstruction): SegmentAnimator =>
  () => [
    {
      dur: instr.beats,
      position: arc(instr.cid, { semiMinor: 0.25, phi: PI }),
      facing: lerpFacingTo((id, segInit) => {
        const myRole = parseProtoId(id).role;
        const them = must(resolveCalledIdentifier(id, instr.cid, segInit));
        return getDir({
          from: segInit[id].pos,
          to: getDancerState(them, segInit).pos,
        }).rotateByDegrees(90 * (myRole === "lark" ? 1 : -1));
      }),
      hands: (id, _frac, draft) => {
        const themId = must(resolveCalledIdentifier(id, instr.cid, draft));
        const twirlHand = isLark(id) ? "right" : "left";
        connectHands(draft, id, twirlHand, themId, otherHand(twirlHand));
      },
    },
  ];
