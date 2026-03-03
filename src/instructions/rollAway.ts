import { z } from "zod";

import {
  BeatsSchema,
  type DancerId,
  getRole,
  type Hand,
  otherHand,
  type ProtoId,
  RoleSchema,
} from "../contraCore";
import { ellipsePosition, PI, TWO_PI } from "../geometry";
import { connectHands, getDancerState } from "../worldState";
import {
  type CalledDirection,
  findDancerInCalledDirection,
  InstructionIdSchema,
} from "./_base";
import { type SegmentAnimator } from "./_segment";

export const RollAwayInstructionSchema = z.object({
  id: InstructionIdSchema,
  beats: BeatsSchema.default(2),
  type: z.literal("roll_away"),
  roller: RoleSchema,
  dir: z.enum(["rtl", "ltr"]),
});
export type RollAwayInstruction = z.infer<typeof RollAwayInstructionSchema>;

export const rollAwaySegments =
  (instr: RollAwayInstruction): SegmentAnimator =>
  (init, who) => {
    const isRtl = instr.dir === "rtl";

    // Direction from roller to rollee, and vice versa (they're side-by-side)
    const rollerToRollee: CalledDirection = isRtl ? "on_right" : "on_left";
    const rolleeToRoller: CalledDirection = isRtl ? "on_left" : "on_right";

    // Assert & pre-compute partner map: each dancer must have an opposite-role
    // partner in the expected direction.
    const partners = new Map<ProtoId, DancerId>();
    for (const id of who) {
      const isRoller = getRole(id) === instr.roller;
      const dir = isRoller ? rollerToRollee : rolleeToRoller;
      const found = findDancerInCalledDirection(id, dir, init, {
        roles: "different",
      });
      if (!found) {
        throw new Error(
          `${id} has no opposite-role dancer on their ${dir} for roll away`,
        );
      }
      partners.set(id, found);
    }

    // Arc direction: rollee goes in front, roller goes behind
    const semiMinor = isRtl ? -0.25 : 0.25;

    // Hands: first half roller holds [rtl: right, ltr: left]
    const firstRollerHand: Hand = isRtl ? "right" : "left";
    const firstRolleeHand: Hand = otherHand(firstRollerHand);

    // Rollee's facing rotates a full 360° [ccw if rtl, cw if ltr]
    const rolleeRotation = isRtl ? TWO_PI : -TWO_PI;

    return [
      {
        dur: instr.beats,
        position: (id, frac, segInit) => {
          const themId = partners.get(id)!;
          const start = segInit[id].pos;
          const end = getDancerState(themId, segInit).pos;
          return ellipsePosition(start, end, semiMinor, PI * frac);
        },
        facing: (id, frac, segInit) => {
          const isRoller = getRole(id) === instr.roller;
          if (isRoller) return segInit[id].facing;
          return segInit[id].facing.rotateByRadians(rolleeRotation * frac);
        },
        hands: (id, frac, draft) => {
          const isRoller = getRole(id) === instr.roller;
          const themId = partners.get(id)!;

          const firstHalf = frac < 0.5;
          const myHand: Hand = isRoller
            ? firstHalf
              ? firstRollerHand
              : otherHand(firstRollerHand)
            : firstHalf
              ? firstRolleeHand
              : otherHand(firstRolleeHand);
          const theirHand: Hand = isRoller
            ? firstHalf
              ? firstRolleeHand
              : otherHand(firstRolleeHand)
            : firstHalf
              ? firstRollerHand
              : otherHand(firstRollerHand);

          connectHands(draft, id, myHand, themId, theirHand);
        },
      },
    ];
  };
