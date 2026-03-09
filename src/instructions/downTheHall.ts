import type { Vector } from "vecti";
import { z } from "zod";

import { ALL_PROTO_IDS, type Beats } from "../contraCore";
import { resolveShortLine } from "../formations";
import { roughlySameDir, SOUTH } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { indexOf, must } from "../utils";
import { connectHands, Dancer, type WorldState } from "../worldState";
import { instructionBaseSchemaFields } from "./_base";
import {
  type InstructionAnimator,
  makeImmediateSegment,
  type Segment,
} from "./_segment";
import { resolveInsideHand } from "./takeHands";

export const DownTheHallInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("down_the_hall"),
  distance: z.number(),
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
  // Assert all dancers face approximately the correct direction
  for (const protoId of ALL_PROTO_IDS) {
    const line = resolveShortLine(Dancer.get(protoId, init));
    for (const d of line) {
      if (!roughlySameDir(d.facing, dir)) {
        throw new SnazzyError([
          "Dancer ",
          { dancerId: d.id },
          " is not facing approximately ",
          dirName,
          " the hall",
        ]);
      }
    }
  }

  return [
    // Connect inside hands between adjacent dancers in the line
    makeImmediateSegment(init, (id, draft) => {
      const line = resolveShortLine(Dancer.get(id, init));
      const idx = must(
        indexOf(
          line.map((d) => d.protoId),
          id,
        ),
      );
      if (idx < 3) {
        const adjId = line[idx + 1].id;
        const adjState = Dancer.get(adjId, draft);
        const myHand = resolveInsideHand(Dancer.get(id, draft), adjState);
        if (!myHand)
          throw new SnazzyError([
            { dancerId: id },
            " can't determine inside hand with ",
            { dancerId: adjId },
          ]);
        const theirHand = resolveInsideHand(adjState, Dancer.get(id, draft));
        if (!theirHand)
          throw new SnazzyError([
            { dancerId: adjId },
            " can't determine inside hand with ",
            { dancerId: id },
          ]);
        connectHands(draft, id, myHand, adjId, theirHand);
      }
    }),
    // Walk down/up the hall
    {
      dur: instr.beats,
      position: (dancer, frac) =>
        dancer.pos.add(dir.multiply(instr.distance * frac)),
    },
  ];
}

export const downTheHallSegments: InstructionAnimator<
  DownTheHallInstruction
> = (instr, init) => theHallSegments(SOUTH, "down", instr, init);
