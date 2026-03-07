import { Vector } from "vecti";
import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { roughlySameDir } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { must } from "../utils";
import { Dancer, getDancerSide } from "../worldState";
import { instructionBaseSchemaFields, resolveCardinalDirection } from "./_base";
import { fudgeToAlignY } from "./_fudge";
import {
  hold,
  type InstructionAnimator,
  lerpFacingTo,
  linearTo,
  type Segment,
} from "./_segment";

export const LongLinesForwardBackInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
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
    if (
      !roughlySameDir(
        init[id].facing,
        must(resolveCardinalDirection("across", init[id].pos), [
          { dancerId: id },
          "is in the middle, can't tell which way to move",
        ]),
      )
    ) {
      throw new SnazzyError([
        { dancerId: id },
        " must face across for long lines forward and back",
      ]);
    }
  }

  // Pre-compute opposite-role neighbors on each side, asserting they exist
  const leftPartners = new Map<ProtoId, Dancer>();
  const rightPartners = new Map<ProtoId, Dancer>();
  for (const id of who) {
    const left = Dancer.get(id, init).findDancerInCalledDirection("on_left", {
      roles: "different",
    });
    if (!left) {
      throw new SnazzyError([
        { dancerId: id },
        " has no opposite-role dancer on their left for long lines forward and back",
      ]);
    }
    leftPartners.set(id, left);

    const right = Dancer.get(id, init).findDancerInCalledDirection("on_right", {
      roles: "different",
    });
    if (!right) {
      throw new SnazzyError([
        { dancerId: id },
        " has no opposite-role dancer on their right for long lines forward and back",
      ]);
    }
    rightPartners.set(id, right);
  }

  // Pre-compute non-overlapping y targets per side
  const westDancers = [...who].filter(
    (id) => getDancerSide(init[id]) == "west",
  );
  const eastDancers = [...who].filter(
    (id) => getDancerSide(init[id]) == "east",
  );
  const yTargets = new Map<ProtoId, number>([
    ...assignNonOverlappingSlots(
      westDancers.map((id) => ({ id, y: init[id].pos.y })),
    ),
    ...assignNonOverlappingSlots(
      eastDancers.map((id) => ({ id, y: init[id].pos.y })),
    ),
  ]);

  const halfBeats = instr.beats / 2;

  const segments: Segment[] = [
    // Walk forward: take inside hands, move to x=±0.2, y=assigned slot
    {
      dur: halfBeats,
      position: linearTo((dancer) => {
        const x = Math.sign(init[dancer.protoId].pos.x) * 0.2;
        return new Vector(x, yTargets.get(dancer.protoId)!);
      }),
      facing: lerpFacingTo((dancer) =>
        must(resolveCardinalDirection("across", dancer.pos), [
          { dancerId: dancer.protoId },
          "is in the middle, can't tell which way to move",
        ]),
      ),
      hands: (dancer) =>
        hold(
          ["left", leftPartners.get(dancer.protoId)!.id, "right"],
          ["right", rightPartners.get(dancer.protoId)!.id, "left"],
        ),
    },
    // Step back out: x=±0.5, keep y, keep hands
    {
      dur: halfBeats,
      position: linearTo((dancer) => {
        const x = Math.sign(dancer.pos.x) * 0.5;
        return new Vector(x, dancer.pos.y);
      }),
    },
  ];

  return fudgeToAlignY(segments, init, who);
};
