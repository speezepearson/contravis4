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

/**
 * Assigns distinct half-integer y-positions (values of the form n + 0.5)
 * to a set of dancers, minimizing total displacement sum |y_i - slot_i|.
 * Exploits the fact that the optimal 1D assignment preserves sorted order.
 */
export function assignNonOverlappingSlots(
  dancers: ReadonlyArray<{ id: ProtoId; y: number }>,
): Map<ProtoId, number> {
  if (dancers.length === 0) return new Map();
  if (dancers.length === 1) {
    const d = dancers[0];
    return new Map([[d.id, Math.round(d.y - 0.5) + 0.5]]);
  }

  const sorted = [...dancers].sort((a, b) => a.y - b.y);
  const n = sorted.length;

  // Candidate half-integer slots with margin of n on each side
  const loSlot = Math.round(sorted[0].y - 0.5) + 0.5 - n;
  const hiSlot = Math.round(sorted[n - 1].y - 0.5) + 0.5 + n;
  const candidates: number[] = [];
  for (let s = loSlot; s <= hiSlot; s += 1) {
    candidates.push(s);
  }

  // Brute-force ordered search (N ≤ 4, so this is instant)
  let bestCost = Infinity;
  let bestSlots: number[] = [];

  function search(i: number, ci: number, slots: number[], cost: number): void {
    if (i === n) {
      if (cost < bestCost) {
        bestCost = cost;
        bestSlots = [...slots];
      }
      return;
    }
    for (let j = ci; j < candidates.length; j++) {
      const c = cost + Math.abs(sorted[i].y - candidates[j]);
      if (c >= bestCost) continue;
      slots.push(candidates[j]);
      search(i + 1, j + 1, slots, c);
      slots.pop();
    }
  }

  search(0, 0, [], 0);

  const result = new Map<ProtoId, number>();
  for (let i = 0; i < n; i++) {
    result.set(sorted[i].id, bestSlots[i]);
  }
  return result;
}

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

  // Pre-compute non-overlapping y targets per side
  const leftDancers = [...who].filter((id) => init[id].pos.x < 0);
  const rightDancers = [...who].filter((id) => init[id].pos.x > 0);
  const yTargets = new Map<ProtoId, number>([
    ...assignNonOverlappingSlots(
      leftDancers.map((id) => ({ id, y: init[id].pos.y })),
    ),
    ...assignNonOverlappingSlots(
      rightDancers.map((id) => ({ id, y: init[id].pos.y })),
    ),
  ]);

  const halfBeats = instr.beats / 2;

  return [
    // Walk forward: take inside hands, move to x=±0.2, y=assigned slot
    {
      dur: halfBeats,
      position: linearTo((id) => {
        const x = Math.sign(init[id].pos.x) * 0.2;
        return new Vector(x, yTargets.get(id)!);
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
