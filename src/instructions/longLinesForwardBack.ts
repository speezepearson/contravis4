import { Vector } from "vecti";
import { z } from "zod";

import { BeatsSchema, type DancerId, type ProtoId } from "../contraCore";
import { EAST, WEST } from "../geometry";
import {
  facesAcross,
  findDancerInCalledDirection,
  InstructionIdSchema,
} from "./_base";
import {
  hold,
  type InstructionAnimator,
  lerpFacingTo,
  linearTo,
} from "./_segment";

export const LongLinesForwardBackInstructionSchema = z.object({
  id: InstructionIdSchema,
  beats: BeatsSchema.default(8),
  type: z.literal("long_lines_forward_back"),
});
export type LongLinesForwardBackInstruction = z.infer<
  typeof LongLinesForwardBackInstructionSchema
>;

export const longLinesForwardBackSegments: InstructionAnimator<
  LongLinesForwardBackInstruction
> = (instr, init, who) => {
  // Assert everybody faces across
  for (const id of who) {
    if (!facesAcross(id, init)) {
      throw new Error(`${id} must face across for long lines forward and back`);
    }
  }

  // Pre-compute opposite-role neighbors on each side, asserting they exist
  const leftPartners = new Map<ProtoId, DancerId>();
  const rightPartners = new Map<ProtoId, DancerId>();
  for (const id of who) {
    const left = findDancerInCalledDirection(id, "on_left", init, {
      roles: "different",
    });
    if (!left) {
      throw new Error(
        `${id} has no opposite-role dancer on their left for long lines forward and back`,
      );
    }
    leftPartners.set(id, left);

    const right = findDancerInCalledDirection(id, "on_right", init, {
      roles: "different",
    });
    if (!right) {
      throw new Error(
        `${id} has no opposite-role dancer on their right for long lines forward and back`,
      );
    }
    rightPartners.set(id, right);
  }

  const halfBeats = instr.beats / 2;

  return [
    // Walk forward: take inside hands, move to x=±0.2, y=nearest half-integer
    {
      dur: halfBeats,
      position: linearTo((id, segInit) => {
        const x = Math.sign(segInit[id].pos.x) * 0.2;
        const y = Math.round(segInit[id].pos.y - 0.5) + 0.5;
        return new Vector(x, y);
      }),
      facing: lerpFacingTo((id, segInit) =>
        segInit[id].pos.x < 0 ? EAST : WEST,
      ),
      hands: (id) =>
        hold(
          ["left", leftPartners.get(id)!, "right"],
          ["right", rightPartners.get(id)!, "left"],
        ),
    },
    // Step back out: x=±0.5, keep y, drop hands
    {
      dur: halfBeats,
      position: linearTo((id, segInit) => {
        const x = Math.sign(segInit[id].pos.x) * 0.5;
        return new Vector(x, segInit[id].pos.y);
      }),
      hands: () => ({}),
    },
  ];
};
