import { z } from "zod";

import {
  getRole,
  isLark,
  type ProtoId,
  type Relationship,
  resolveRelationship,
} from "../contraCore";
import { PI, revolve } from "../geometry";
import { connectHands, getDancerState } from "../worldState";
import { findDancerOnSide, instructionBaseSchemaFields } from "./_base";
import { rotateFacingBy, type SegmentAnimator } from "./_segment";

export const CourtesyTurnInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("courtesy_turn"),
});
export type CourtesyTurnInstruction = z.infer<
  typeof CourtesyTurnInstructionSchema
>;

export const courtesyTurnSegments =
  (instr: CourtesyTurnInstruction): SegmentAnimator =>
  (init, who) => {
    // Discover each dancer's courtesy turn foil:
    // larks have the robin on their right, robins have the lark on their left.
    const foils = new Map<ProtoId, Relationship>();
    for (const id of who) {
      const side = isLark(id) ? "on_right" : "on_left";
      const found = findDancerOnSide(id, side, init, { roles: 'different' });
      if (!found) {
        throw new Error(
          `${id} has no dancer on their ${isLark(id) ? "right" : "left"} for courtesy turn`,
        );
      }
      foils.set(id, found.rel);
    }

    return [
      {
        dur: instr.beats,
        position: (id, frac, segInit) => {
          const rel = foils.get(id)!;
          const myPos = segInit[id].pos;
          const theirPos = getDancerState(
            resolveRelationship(id, rel),
            segInit,
          ).pos;
          const center = myPos.add(theirPos).divide(2);
          return revolve(myPos, { around: center, radians: PI * frac });
        },
        facing: rotateFacingBy(() => PI),
        hands: (id, _frac, draft) => {
          const rel = foils.get(id)!;
          connectHands(draft, id, "left", rel, "left");
          connectHands(draft, id, "right", rel, "right");
        },
      },
    ];
  };
