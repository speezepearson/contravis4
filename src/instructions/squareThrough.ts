import { z } from "zod";

import { HandSchema, otherHand, type ProtoId } from "../contraCore";
import { must } from "../utils";
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
import {
  animatePlans,
  type DancerSegment,
  evaluatePlansFinalState,
} from "./_plan";
import { planBalance } from "./balance";
import { planFace } from "./face";
import { planPullBy } from "./pullBy";
import { computeTakeHandsFinalState, planTakeHands } from "./takeHands";

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

/**
 * Build a plan for squareThrough by computing intermediate world states
 * (via evaluatePlansFinalState) and chaining per-dancer plans.
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

  // Each phase: build per-dancer plans for all dancers, then compute next state.
  const phases: Map<ProtoId, DancerSegment[]>[] = [];
  let state = init;

  function addPhase(
    planBuilder: (d: Dancer) => DancerSegment[],
  ): Map<ProtoId, DancerSegment[]> {
    const plansMap = new Map<ProtoId, DancerSegment[]>();
    for (const pid of who) {
      plansMap.set(pid, planBuilder(Dancer.get(pid, state)));
    }
    phases.push(plansMap);
    state = evaluatePlansFinalState(state, who, (dancer) =>
      must(plansMap.get(dancer.protoId)),
    );
    return plansMap;
  }

  function addTakeHandsPhase(
    takeInstr: Parameters<typeof computeTakeHandsFinalState>[0],
  ) {
    const finalState = computeTakeHandsFinalState(takeInstr, state);
    addPhase((d) => planTakeHands(takeInstr, d, finalState));
  }

  // 1. Face cid1
  const faceInstr1 = {
    id,
    beats: 0 as const,
    type: "face" as const,
    direction: cidToDirection(cid1),
  };
  addPhase((d) => planFace(faceInstr1, d));

  // 2. Take firstHand hands with cid1
  addTakeHandsPhase({
    id,
    beats: 0 as const,
    type: "take_hands" as const,
    cid: cid1,
    hand: firstHand,
  });

  // 3. If n=2 or 4: balance
  if (nPullBys === 2 || nPullBys === 4) {
    addPhase((d) =>
      planBalance(
        { id, beats: balanceBeats, type: "balance" as const, cid: cid1 },
        d,
      ),
    );
  }

  // 4. Pull by firstHand
  addPhase((d) =>
    planPullBy(
      {
        id,
        beats: pullByBeats,
        type: "pull_by" as const,
        cid: cid1,
        hand: firstHand,
      },
      d,
    ),
  );

  // 5. Face cid2
  addPhase((d) =>
    planFace(
      {
        id,
        beats: 0 as const,
        type: "face" as const,
        direction: cidToDirection(cid2),
      },
      d,
    ),
  );

  // 6. Pull by secondHand with cid2
  addPhase((d) =>
    planPullBy(
      {
        id,
        beats: pullByBeats,
        type: "pull_by" as const,
        cid: cid2,
        hand: secondHand,
      },
      d,
    ),
  );

  if (nPullBys >= 3) {
    // 7. Face cid1 again
    addPhase((d) =>
      planFace(
        {
          id,
          beats: 0 as const,
          type: "face" as const,
          direction: cidToDirection(cid1),
        },
        d,
      ),
    );

    // Take hands again
    addTakeHandsPhase({
      id,
      beats: 0 as const,
      type: "take_hands" as const,
      cid: cid1,
      hand: firstHand,
    });

    // 8. If n=4: balance
    if (nPullBys === 4) {
      addPhase((d) =>
        planBalance(
          { id, beats: balanceBeats, type: "balance" as const, cid: cid1 },
          d,
        ),
      );
    }

    // 9. Pull by firstHand
    addPhase((d) =>
      planPullBy(
        {
          id,
          beats: pullByBeats,
          type: "pull_by" as const,
          cid: cid1,
          hand: firstHand,
        },
        d,
      ),
    );

    if (nPullBys === 4) {
      // 10. Face cid2 again
      addPhase((d) =>
        planFace(
          {
            id,
            beats: 0 as const,
            type: "face" as const,
            direction: cidToDirection(cid2),
          },
          d,
        ),
      );

      // 11. Pull by secondHand with cid2
      addPhase((d) =>
        planPullBy(
          {
            id,
            beats: pullByBeats,
            type: "pull_by" as const,
            cid: cid2,
            hand: secondHand,
          },
          d,
        ),
      );
    }
  }

  return (dancer: Dancer): DancerSegment[] =>
    phases.flatMap((phase) => must(phase.get(dancer.protoId)));
}

export function squareThroughAnimator(
  instr: SquareThroughInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, planSquareThrough(instr, init, who));
}
