import { z } from "zod";

import { isLark, otherHand, parseProtoId } from "../contraCore";
import { getDir, PI } from "../geometry";
import { connectHands, getDancerState } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveMatches,
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
  (init) => {
    const matches = resolveMatches(instr.cid, init);
    return [
      {
        dur: instr.beats,
        position: arc(instr.cid, { semiMinor: 0.25, phi: PI }),
        facing: lerpFacingTo((id, segInit) => {
          const myRole = parseProtoId(id).role;
          return getDir({
            from: segInit[id].pos,
            to: getDancerState(matches[id], segInit).pos,
          }).rotateByDegrees(90 * (myRole === "lark" ? 1 : -1));
        }),
        hands: (id, _frac, draft) => {
          const twirlHand = isLark(id) ? "right" : "left";
          connectHands(draft, id, twirlHand, matches[id], otherHand(twirlHand));
        },
      },
    ];
  };
