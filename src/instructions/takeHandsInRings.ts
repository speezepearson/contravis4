import memoize from "lodash/memoize";
import sortBy from "lodash/sortBy";
import { z } from "zod";

import { type ProtoId } from "../contraCore";
import {
  makePreferHinted,
  preferCloser,
  preferOneInFront,
  preferRecent,
  type Tiebreaker,
} from "../formations";
import { ccwRadsBetween, getDir } from "../geometry";
import type { CalledIdentifier } from "../identifiers";
import { avgPos, Dancer, mapWorldState, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  getGroupOfFour,
  instructionBaseSchemaFields,
  resolveRing,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import {
  getSegmentFrameAtFrac,
  type InstructionAnimator,
  type Segment,
} from "./_segment";

export const TakeHandsInRingsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("take_hands_in_rings"),
  beats: z.literal(0),
  disambiguatingCid: CalledIdentifierSchema.optional(),
});
export type TakeHandsInRingsInstruction = z.infer<
  typeof TakeHandsInRingsInstructionSchema
>;

/**
 * Build the 0-beat segment that forms rings of four.
 *
 * Each dancer identifies:
 *   (a) the opposite-role dancer across the set
 *   (b) the opposite-role dancer north or south (whichever is more like their facing)
 * Then turns to face halfway between those two, and takes inside hands with each.
 */
export function makeRingSegment(
  init: WorldState,
  disambiguatingCid?: CalledIdentifier,
): Segment {
  const tiebreakers: [Tiebreaker, ...Tiebreaker[]] = disambiguatingCid
    ? [
        makePreferHinted(disambiguatingCid),
        preferCloser,
        preferOneInFront,
        preferRecent,
      ]
    : [preferCloser, preferOneInFront, preferRecent];
  const getGroup = memoize((dancer: Dancer) =>
    getGroupOfFour(dancer, { by: tiebreakers }),
  );
  const final = mapWorldState(init, (dancer) => {
    const group = getGroup(dancer);
    const center = avgPos(...group);
    dancer.facing = getDir({ from: dancer.pos, to: center });
    const [right, left] = sortBy(
      group.filter((d) => d.role !== dancer.role),
      (d) =>
        ccwRadsBetween(dancer.facing, getDir({ from: dancer.pos, to: d.pos })),
    );
    dancer.hands = {
      left: { theirId: left.id, theirHand: "right" },
      right: { theirId: right.id, theirHand: "left" },
    };
  });

  return {
    dur: 0,
    position: (dancer) => final[dancer.protoId].pos,
    facing: (dancer) => final[dancer.protoId].facing,
    hands: (dancer) => final[dancer.protoId].hands,
    interactedWith: (dancer) => getGroup(dancer).map((d) => d.id),
  };
}

/**
 * Compute the final state after forming rings (facing center, hands connected).
 * Used by planTakeHandsInRings to give each dancer their final state.
 */
function computeRingFinalState(
  init: WorldState,
  disambiguatingCid?: CalledIdentifier,
): WorldState {
  const tiebreakers: [Tiebreaker, ...Tiebreaker[]] = disambiguatingCid
    ? [
        makePreferHinted(disambiguatingCid),
        preferCloser,
        preferOneInFront,
        preferRecent,
      ]
    : [preferCloser, preferOneInFront, preferRecent];
  const getGroup = memoize((dancer: Dancer) =>
    getGroupOfFour(dancer, { by: tiebreakers }),
  );
  return mapWorldState(init, (dancer) => {
    const group = getGroup(dancer);
    const center = avgPos(...group);
    dancer.facing = getDir({ from: dancer.pos, to: center });
    const [right, left] = sortBy(
      group.filter((d) => d.role !== dancer.role),
      (d) =>
        ccwRadsBetween(dancer.facing, getDir({ from: dancer.pos, to: d.pos })),
    );
    dancer.hands = {
      left: { theirId: left.id, theirHand: "right" },
      right: { theirId: right.id, theirHand: "left" },
    };
  });
}

export function planTakeHandsInRings(
  dancer: Dancer,
  finalState: WorldState,
): DancerSegment[] {
  const final = Dancer.get(dancer.protoId, finalState);
  const group = resolveRing(final);
  return [
    {
      dur: 0,
      facing: () => final.facing,
      hands: () => final.hands,
      interactedWith: () => group.map((d) => d.id),
    },
  ];
}

export const takeHandsInRingsSegments: InstructionAnimator<
  TakeHandsInRingsInstruction
> = (instr, init, who) => {
  const segment = makeRingSegment(init, instr.disambiguatingCid);
  const endState = getSegmentFrameAtFrac(segment, init, who, 1);
  for (const protoId of who) resolveRing(Dancer.get(protoId, endState));
  return [segment];
};

export function takeHandsInRingsAnimator(
  instr: TakeHandsInRingsInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const finalState = computeRingFinalState(init, instr.disambiguatingCid);
  // Validate rings form correctly
  for (const protoId of who) resolveRing(Dancer.get(protoId, finalState));
  return animatePlans(init, who, (dancer) =>
    planTakeHandsInRings(dancer, finalState),
  );
}
