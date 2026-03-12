import { z } from "zod";

import { HandSchema, otherHand, type ProtoId } from "../contraCore";
import { Dancer, type WorldState } from "../worldState";
import {
  type BaseCalledDirection,
  type BaseCalledIdentifier,
  type CalledDirection,
  type CalledIdentifier,
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
  towardsLabel,
  towardsPerson,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import {
  advanceState,
  type InstructionAnimator,
  type Segment,
} from "./_segment";
import { planBalance } from "./balance";
import { balanceSegments } from "./balance";
import { planFace } from "./face";
import { faceSegments } from "./face";
import { planPullBy } from "./pullBy";
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

function baseCidToDirection(cid: BaseCalledIdentifier): BaseCalledDirection {
  switch (cid.type) {
    case "label":
      return towardsLabel(cid.label);
    case "PersonInDirection":
      return towardsPerson(cid.dir);
  }
}

function cidToDirection(cid: CalledIdentifier): CalledDirection {
  switch (cid.type) {
    case "label":
    case "PersonInDirection":
      return baseCidToDirection(cid);
    case "PerRole":
      return {
        type: "PerRole",
        larks: baseCidToDirection(cid.larks),
        robins: baseCidToDirection(cid.robins),
      };
    case "PerProgDir":
      return {
        type: "PerProgDir",
        ups: baseCidToDirection(cid.ups),
        downs: baseCidToDirection(cid.downs),
      };
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

/**
 * Build a plan for squareThrough by computing intermediate world states
 * (via the segment-based sub-instructions) and chaining per-dancer plans.
 */
export function planSquareThrough(
  instr: SquareThroughInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): (dancer: Dancer) => DancerSegment[] {
  const { id, nPullBys, firstHand, cid1, cid2 } = instr;
  const secondHand = otherHand(firstHand);

  const nBalances = nPullBys === 2 ? 1 : nPullBys === 4 ? 2 : 0;
  const totalUnits = nBalances * 2 + nPullBys;
  const unitBeats = instr.beats / totalUnits;
  const balanceBeats = unitBeats * 2;
  const pullByBeats = unitBeats;

  // Compute intermediate states and collect per-dancer plan builders.
  // Each step: { state, getPlan: (dancer at that state) => DancerSegment[] }
  const steps: Array<{
    state: WorldState;
    getPlan: (d: Dancer) => DancerSegment[];
  }> = [];
  let state = init;

  function appendStep(
    segs: Segment[],
    getPlan: (d: Dancer) => DancerSegment[],
  ) {
    steps.push({ state, getPlan });
    state = advanceState(segs, state, who);
  }

  // 1. Face cid1
  const faceInstr1 = {
    id,
    beats: 0 as const,
    type: "face" as const,
    direction: cidToDirection(cid1),
  };
  appendStep(faceSegments(faceInstr1, state, who), (d) =>
    planFace(faceInstr1, d),
  );

  // 2. Take hands — use segment-based approach and extract hands from result state
  const takeSegs1 = takeHandsSegments(
    {
      id,
      beats: 0 as const,
      type: "take_hands" as const,
      cid: cid1,
      hand: firstHand,
    },
    state,
    who,
  );
  const postTake1 = advanceState(takeSegs1, state, who);
  steps.push({
    state,
    getPlan: (d) => {
      const final = Dancer.get(d.protoId, postTake1);
      return [{ dur: 0, hands: () => final.hands }];
    },
  });
  state = postTake1;

  // 3. If n=2 or 4: balance
  if (nPullBys === 2 || nPullBys === 4) {
    const balInstr = {
      id,
      beats: balanceBeats,
      type: "balance" as const,
      cid: cid1,
    };
    appendStep(balanceSegments(balInstr, state, who), (d) =>
      planBalance(balInstr, d),
    );
  }

  // 4. Pull by firstHand
  const pb1 = {
    id,
    beats: pullByBeats,
    type: "pull_by" as const,
    cid: cid1,
    hand: firstHand,
  };
  appendStep(pullBySegments(pb1, state, who), (d) => planPullBy(pb1, d));

  // 5. Face cid2
  const faceInstr2 = {
    id,
    beats: 0 as const,
    type: "face" as const,
    direction: cidToDirection(cid2),
  };
  appendStep(faceSegments(faceInstr2, state, who), (d) =>
    planFace(faceInstr2, d),
  );

  // 6. Pull by secondHand with cid2
  const pb2 = {
    id,
    beats: pullByBeats,
    type: "pull_by" as const,
    cid: cid2,
    hand: secondHand,
  };
  appendStep(pullBySegments(pb2, state, who), (d) => planPullBy(pb2, d));

  if (nPullBys >= 3) {
    // 7. Face cid1 again
    const faceInstr3 = {
      id,
      beats: 0 as const,
      type: "face" as const,
      direction: cidToDirection(cid1),
    };
    appendStep(faceSegments(faceInstr3, state, who), (d) =>
      planFace(faceInstr3, d),
    );

    // Take hands again
    const takeSegs2 = takeHandsSegments(
      {
        id,
        beats: 0 as const,
        type: "take_hands" as const,
        cid: cid1,
        hand: firstHand,
      },
      state,
      who,
    );
    const postTake2 = advanceState(takeSegs2, state, who);
    steps.push({
      state,
      getPlan: (d) => {
        const final = Dancer.get(d.protoId, postTake2);
        return [{ dur: 0, hands: () => final.hands }];
      },
    });
    state = postTake2;

    // 8. If n=4: balance
    if (nPullBys === 4) {
      const balInstr2 = {
        id,
        beats: balanceBeats,
        type: "balance" as const,
        cid: cid1,
      };
      appendStep(balanceSegments(balInstr2, state, who), (d) =>
        planBalance(balInstr2, d),
      );
    }

    // 9. Pull by firstHand
    const pb3 = {
      id,
      beats: pullByBeats,
      type: "pull_by" as const,
      cid: cid1,
      hand: firstHand,
    };
    appendStep(pullBySegments(pb3, state, who), (d) => planPullBy(pb3, d));

    if (nPullBys === 4) {
      // 10. Face cid2 again
      const faceInstr4 = {
        id,
        beats: 0 as const,
        type: "face" as const,
        direction: cidToDirection(cid2),
      };
      appendStep(faceSegments(faceInstr4, state, who), (d) =>
        planFace(faceInstr4, d),
      );

      // 11. Pull by secondHand with cid2
      const pb4 = {
        id,
        beats: pullByBeats,
        type: "pull_by" as const,
        cid: cid2,
        hand: secondHand,
      };
      appendStep(pullBySegments(pb4, state, who), (d) => planPullBy(pb4, d));
    }
  }

  return (dancer: Dancer): DancerSegment[] =>
    steps.flatMap(({ state: s, getPlan }) =>
      getPlan(Dancer.get(dancer.protoId, s)),
    );
}

export function squareThroughAnimator(
  instr: SquareThroughInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, planSquareThrough(instr, init, who));
}
