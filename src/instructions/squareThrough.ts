import { z } from "zod";

import { HandSchema, otherHand } from "../contraCore";
import {
  type CalledDirection,
  type CalledIdentifier,
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  towardsLabel,
  towardsPerson,
} from "./_base";
import {
  advanceState,
  type InstructionAnimator,
  type Segment,
} from "./_segment";
import { balanceSegments } from "./balance";
import { faceSegments } from "./face";
import { pullBySegments } from "./pullBy";
import { takeHandsSegments } from "./takeHands";

const NPullBysSchema = z.union([z.literal(2), z.literal(3), z.literal(4)]);

export const SquareThroughInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("square_through"),
  nPullBys: NPullBysSchema,
  firstHand: HandSchema,
  cid1: CalledIdentifierSchema,
  cid2: CalledIdentifierSchema,
});
export type SquareThroughInstruction = z.infer<
  typeof SquareThroughInstructionSchema
>;

function cidToDirection(cid: CalledIdentifier): CalledDirection {
  switch (cid.type) {
    case "label":
      return towardsLabel(cid.label);
    case "PersonInDirection":
      return towardsPerson(cid.dir);
  }
}

export const squareThroughSegments: InstructionAnimator<
  SquareThroughInstruction
> = (instr, init, who) => {
  const { id, nPullBys, firstHand, cid1, cid2 } = instr;
  const secondHand = otherHand(firstHand);

  const nBalances = nPullBys === 2 ? 1 : nPullBys === 4 ? 2 : 0;
  const totalUnits = nBalances * 2 + nPullBys;
  const unitBeats = instr.beats / totalUnits;
  const balanceBeats = unitBeats * 2;
  const pullByBeats = unitBeats;

  let state = init;
  const allSegments: Segment[] = [];

  function append(segs: Segment[]) {
    allSegments.push(...segs);
    state = advanceState(segs, state, who);
  }

  // 1. Face cid1
  append(
    faceSegments(
      { id, beats: 0, type: "face", direction: cidToDirection(cid1) },
      state,
      who,
    ),
  );

  // 2. Take firstHand hands with cid1
  append(
    takeHandsSegments(
      { id, beats: 0, type: "take_hands", cid: cid1, hand: firstHand },
      state,
      who,
    ),
  );

  // 3. If n=2 or 4: balance
  if (nPullBys === 2 || nPullBys === 4) {
    append(
      balanceSegments(
        { id, beats: balanceBeats, type: "balance", cid: cid1 },
        state,
        who,
      ),
    );
  }

  // 4. Pull by firstHand
  append(
    pullBySegments(
      { id, beats: pullByBeats, type: "pull_by", cid: cid1, hand: firstHand },
      state,
      who,
    ),
  );

  // 5. Turn to face cid2
  append(
    faceSegments(
      { id, beats: 0, type: "face", direction: cidToDirection(cid2) },
      state,
      who,
    ),
  );

  // 6. Pull by otherHand with cid2
  append(
    pullBySegments(
      {
        id,
        beats: pullByBeats,
        type: "pull_by",
        cid: cid2,
        hand: secondHand,
      },
      state,
      who,
    ),
  );

  // If n=2: done
  if (nPullBys === 2) return allSegments;

  // 7. Turn to face cid1 again, take firstHand again
  append(
    faceSegments(
      { id, beats: 0, type: "face", direction: cidToDirection(cid1) },
      state,
      who,
    ),
  );
  append(
    takeHandsSegments(
      { id, beats: 0, type: "take_hands", cid: cid1, hand: firstHand },
      state,
      who,
    ),
  );

  // 8. If n=4: balance
  if (nPullBys === 4) {
    append(
      balanceSegments(
        { id, beats: balanceBeats, type: "balance", cid: cid1 },
        state,
        who,
      ),
    );
  }

  // 9. Pull by firstHand
  append(
    pullBySegments(
      { id, beats: pullByBeats, type: "pull_by", cid: cid1, hand: firstHand },
      state,
      who,
    ),
  );

  // If n=3: done
  if (nPullBys === 3) return allSegments;

  // 10. Turn to face cid2 again
  append(
    faceSegments(
      { id, beats: 0, type: "face", direction: cidToDirection(cid2) },
      state,
      who,
    ),
  );

  // 11. Pull by otherHand with cid2
  append(
    pullBySegments(
      {
        id,
        beats: pullByBeats,
        type: "pull_by",
        cid: cid2,
        hand: secondHand,
      },
      state,
      who,
    ),
  );

  return allSegments;
};
