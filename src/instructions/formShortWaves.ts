import { Vector } from "vecti";
import { z } from "zod";

import { ALL_PROTO_IDS, getRole, type Hand, type ProtoId } from "../contraCore";
import { resolveShortLine } from "../formations";
import { NORTH, SOUTH } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { indexOf, must, safeThreshold } from "../utils";
import { Dancer, type DancerHandPointer, type WorldState } from "../worldState";
import { type ContraAnimation, instructionBaseSchemaFields } from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";

export const FormShortWavesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("form_short_waves"),
  beats: z.literal(0),
});
export type FormShortWavesInstruction = z.infer<
  typeof FormShortWavesInstructionSchema
>;

const SHORT_WAVES_XS = [-0.75, -0.25, 0.25, 0.75] as const;

function validate(init: WorldState, who: ReadonlySet<ProtoId>): void {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`formShortWaves instruction must target all dancers`);

  for (const id of ALL_PROTO_IDS) {
    const line = resolveShortLine(Dancer.get(id, init));
    if (getRole(line[1].id) !== getRole(line[2].id)) {
      throw new Error(`dancers in middle of short waves do not have same role`);
    }
    for (let i = 0; i < 3; i++) {
      const isUp = must(
        safeThreshold(line[i].facing.y, {
          neg: "down",
          pos: "up",
        } as const),
        [{ dancerId: line[i].id }, " is not facing up or down"],
      );
      const nextIsUp = must(
        safeThreshold(line[i + 1].facing.y, {
          neg: "down",
          pos: "up",
        } as const),
        [{ dancerId: line[i + 1].id }, " is not facing up or down"],
      );
      if (isUp === nextIsUp) {
        throw new SnazzyError([
          "short waves should have dancers alternating facing up/down, but ",
          { dancerId: line[i].id },
          " and ",
          { dancerId: line[i + 1].id },
          " are both facing ",
          isUp ? "up" : "down",
        ]);
      }
    }
  }
}

// ── Plan-based API ──────────────────────────────────────────────────────

export function planFormShortWaves(dancer: Dancer): DancerSegment[] {
  const line = resolveShortLine(dancer);
  const i = must(
    indexOf(
      line.map((d) => d.protoId),
      dancer.protoId,
    ),
  );

  const facing = dancer.facing.y > 0 ? NORTH : SOUTH;
  const pos = new Vector(SHORT_WAVES_XS[i], dancer.pos.y).add(
    facing.multiply(-0.1),
  );

  // In short waves, adjacent dancers in the line hold hands left-to-left / right-to-right.
  // Facing NORTH: line neighbor to the west (i-1) is on_left, to the east (i+1) is on_right.
  // Facing SOUTH: line neighbor to the east (i+1) is on_left, to the west (i-1) is on_right.
  const facingNorth = facing === NORTH;
  const leftNeighborIdx = facingNorth ? i - 1 : i + 1;
  const rightNeighborIdx = facingNorth ? i + 1 : i - 1;

  const hands: Partial<Record<Hand, DancerHandPointer>> = {};
  if (leftNeighborIdx >= 0 && leftNeighborIdx < line.length) {
    hands.left = { theirId: line[leftNeighborIdx].id, theirHand: "left" };
  }
  if (rightNeighborIdx >= 0 && rightNeighborIdx < line.length) {
    hands.right = { theirId: line[rightNeighborIdx].id, theirHand: "right" };
  }

  return [
    {
      dur: 0,
      position: () => pos,
      facing: () => facing,
      hands: () => hands,
    },
  ];
}

export function formShortWavesAnimator(
  _instr: FormShortWavesInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  validate(init, who);
  return animatePlans(init, who, (dancer) => planFormShortWaves(dancer));
}
