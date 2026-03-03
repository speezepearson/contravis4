import { z } from "zod";

import { type DancerId, isLark, type ProtoId } from "../contraCore";
import { PI, revolve } from "../geometry";
import { connectHands, getDancerState } from "../worldState";
import {
  findDancerInCalledDirection,
  instructionBaseSchemaFields,
} from "./_base";
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
    const foils = new Map<ProtoId, DancerId>();
    for (const id of who) {
      const found = findDancerInCalledDirection(
        id,
        "larks_right_robins_left",
        init,
        { roles: "different" },
      );
      if (!found) {
        throw new Error(
          `${id} has no dancer on their ${isLark(id) ? "right" : "left"} for courtesy turn`,
        );
      }
      foils.set(id, found);
    }

    return [
      {
        dur: instr.beats,
        position: (id, frac, segInit) => {
          const foil = foils.get(id);
          if (!foil) throw new Error(`${id} has no foil for courtesy turn`);
          const myPos = segInit[id].pos;
          const theirPos = getDancerState(foil, segInit).pos;
          const center = myPos.add(theirPos).divide(2);
          return revolve(myPos, { around: center, radians: PI * frac });
        },
        facing: rotateFacingBy(() => PI),
        hands: (id, _frac, draft) => {
          const foil = foils.get(id);
          if (!foil) throw new Error(`${id} has no foil for courtesy turn`);
          connectHands(draft, id, "left", foil, "left");
          connectHands(draft, id, "right", foil, "right");
        },
      },
    ];
  };
