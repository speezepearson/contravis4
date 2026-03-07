import { Vector } from "vecti";
import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { roughlySameDir } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { must } from "../utils";
import { instructionBaseSchemaFields, resolveCardinalDirection } from "./_base";
import { fudgeToAlignY, fudgeToSpaceEvenlyInY } from "./_fudge";
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

  const halfBeats = instr.beats / 2;

  const walkForwardSegment: Segment = {
    dur: halfBeats,
    position: linearTo((dancer) => {
      const x = Math.sign(init[dancer.protoId].pos.x) * 0.2;
      return new Vector(x, dancer.pos.y);
    }),
    facing: lerpFacingTo((dancer) =>
      must(resolveCardinalDirection("across", dancer.pos), [
        { dancerId: dancer.protoId },
        "is in the middle, can't tell which way to move",
      ]),
    ),
    hands: (dancer) =>
      hold(
        [
          "left",
          must(
            dancer.resolveCalledIdentifier("person_on_left", {
              roles: "different",
            }),
            [{ dancerId: dancer.id }, "has nobody on the left"],
          ).id,
          "right",
        ],
        [
          "right",
          must(
            dancer.resolveCalledIdentifier("person_on_right", {
              roles: "different",
            }),
            [{ dancerId: dancer.id }, "has nobody on the right"],
          ).id,
          "left",
        ],
      ),
  };

  const segments: Segment[] = [
    ...fudgeToAlignY(
      fudgeToSpaceEvenlyInY([walkForwardSegment], init, who),
      init,
      who,
    ),
    {
      dur: halfBeats,
      position: linearTo((dancer) => {
        const x = Math.sign(dancer.pos.x) * 0.5;
        return new Vector(x, dancer.pos.y);
      }),
    },
  ];

  return segments;
};
