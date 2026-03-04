import type { Vector } from "vecti";
import { z } from "zod";

import {
  ALL_PROTO_IDS,
  type Beats,
  BeatsSchema,
  type DancerId,
} from "../contraCore";
import { SOUTH } from "../geometry";
import { connectHands, getDancerState, type WorldState } from "../worldState";
import { instructionBaseSchemaFields, resolveShortLines } from "./_base";
import {
  type InstructionAnimator,
  makeImmediateSegment,
  type Segment,
} from "./_segment";
import { resolveInsideHand } from "./takeHands";

export const DownTheHallInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("down_the_hall"),
  beats: BeatsSchema.default(6),
  distance: z.number().default(3),
});
export type DownTheHallInstruction = z.infer<
  typeof DownTheHallInstructionSchema
>;

/** Shared logic for down-the-hall and up-the-hall. */
export function theHallSegments(
  dir: Vector,
  dirName: string,
  instr: { beats: Beats; distance: number },
  init: WorldState,
): Segment[] {
  const shortLines = resolveShortLines(init);

  // Assert all dancers face approximately the correct direction
  for (const protoId of ALL_PROTO_IDS) {
    for (const dancerId of shortLines[protoId]) {
      const state = getDancerState(dancerId, init);
      if (state.facing.dot(dir) < 0.7) {
        throw new Error(
          `Dancer ${dancerId} is not facing approximately ${dirName} the hall`,
        );
      }
    }
  }

  return [
    // Connect inside hands between adjacent dancers in the line
    makeImmediateSegment(init, (id, draft) => {
      const line = shortLines[id];
      const idx = line.indexOf(id as DancerId);
      if (idx < 0) throw new Error(`Proto ${id} not found in its short line`);
      if (idx < 3) {
        const neighborId = line[idx + 1];
        const neighborState = getDancerState(neighborId, draft);
        const myHand = resolveInsideHand(draft[id], neighborState);
        const theirHand = resolveInsideHand(neighborState, draft[id]);
        connectHands(draft, id, myHand, neighborId, theirHand);
      }
    }),
    // Walk down/up the hall
    {
      dur: instr.beats,
      position: (id, frac, segInit) =>
        segInit[id].pos.add(dir.multiply(instr.distance * frac)),
    },
  ];
}

export const downTheHallSegments: InstructionAnimator<
  DownTheHallInstruction
> = (instr, init) => theHallSegments(SOUTH, "down", instr, init);
