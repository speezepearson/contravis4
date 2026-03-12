import type { Vector } from "vecti";
import { z } from "zod";

import {
  ALL_PROTO_IDS,
  type Beats,
  type Hand,
  type ProtoId,
} from "../contraCore";
import { resolveShortLine } from "../formations";
import { roughlySameDir, SOUTH } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { indexOf, lerpVectors, must } from "../utils";
import { connectHands, Dancer, type WorldState } from "../worldState";
import { type ContraAnimation, instructionBaseSchemaFields } from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
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

/** Per-dancer plan for walking down/up the hall. */
export function planTheHall(
  dir: Vector,
  dirName: string,
  instr: { beats: Beats; distance: number },
  dancer: Dancer,
): DancerSegment[] {
  if (!roughlySameDir(dancer.facing, dir)) {
    throw new SnazzyError([
      "Dancer ",
      { dancerId: dancer.id },
      " is not facing approximately ",
      dirName,
      " the hall",
    ]);
  }

  const line = resolveShortLine(dancer);
  const idx = must(
    indexOf(
      line.map((d) => d.protoId),
      dancer.protoId,
    ),
  );

  // Build hands: connect inside hands with each adjacent dancer in the line
  const hands: Partial<
    Record<Hand, { theirId: (typeof line)[0]["id"]; theirHand: Hand }>
  > = {};
  for (const adjIdx of [idx - 1, idx + 1]) {
    if (adjIdx < 0 || adjIdx >= line.length) continue;
    const adj = line[adjIdx];
    const myHand = resolveInsideHand(dancer, adj);
    if (!myHand)
      throw new SnazzyError([
        { dancerId: dancer.id },
        " can't determine inside hand with ",
        { dancerId: adj.id },
      ]);
    const theirHand = resolveInsideHand(adj, dancer);
    if (!theirHand)
      throw new SnazzyError([
        { dancerId: adj.id },
        " can't determine inside hand with ",
        { dancerId: dancer.id },
      ]);
    hands[myHand] = { theirId: adj.id, theirHand };
  }

  const startPos = dancer.pos;
  const endPos = startPos.add(dir.multiply(instr.distance));

  return [
    // Take hands (dur=0)
    { dur: 0, hands: () => hands },
    // Walk
    {
      dur: instr.beats,
      position: (frac) => lerpVectors(startPos, endPos, frac),
    },
  ];
}

/** Shared animator for down/up the hall. */
export function theHallAnimator(
  dir: Vector,
  dirName: string,
  instr: { beats: Beats; distance: number },
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) =>
    planTheHall(dir, dirName, instr, dancer),
  );
}

export const downTheHallSegments: InstructionAnimator<
  DownTheHallInstruction
> = (instr, init) => theHallSegments(SOUTH, "down", instr, init);

export function downTheHallAnimator(
  instr: DownTheHallInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return theHallAnimator(SOUTH, "down", instr, init, who);
}
