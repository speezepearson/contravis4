import { produce } from "immer";
import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { getDir, lerpFacing, PI, revolve } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { assertNever, lerpVectors, must } from "../utils";
import { avgPos, Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
  personInDir,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator } from "./_segment";
import { planCourtesyTurnWithResolvedMatch } from "./courtesyTurn";

export const RobinsChainInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("robins_chain"),
  cid: CalledIdentifierSchema,
});
export type RobinsChainInstruction = z.infer<
  typeof RobinsChainInstructionSchema
>;

// ── Shared resolution logic ─────────────────────────────────────────────

function getReceiver(instr: RobinsChainInstruction, dancer: Dancer): Dancer {
  if (dancer.role !== "robin")
    throw new SnazzyError([
      { dancerId: dancer.id },
      "is a lark, so has no receiver",
    ]);
  const res = must(dancer.resolveCalledIdentifier(instr.cid), [
    { dancerId: dancer.id },
    "has no receiver lark for chain",
  ]);
  if (!res.isLark())
    throw new SnazzyError([
      { dancerId: dancer.id },
      "has no receiver lark for chain; their",
      { cid: instr.cid },
      "is",
      { dancerId: res.id },
      ", a robin",
    ]);
  return res;
}
function getSendee(dancer: Dancer): Dancer {
  if (dancer.role !== "lark")
    throw new SnazzyError([
      { dancerId: dancer.id },
      "is a robin, so has no sendee",
    ]);
  const res = must(
    dancer.resolveCalledIdentifier(
      personInDir("setcounterclockwise", "different"),
    ),
    [
      { dancerId: dancer.id },
      "has no robin in setcounterclockwise direction to send on a chain",
    ],
  );
  if (!res.isRobin())
    throw new SnazzyError([
      "programming error: resolveCalledIdentifier asked for dir=setcounterclockwise, onlyRole=different, but got",
      { dancerId: res.id },
      "for",
      { dancerId: dancer.id },
    ]);
  return res;
}

// ── Legacy Segment[] API ────────────────────────────────────────────────

export const robinsChainSegments: InstructionAnimator<
  RobinsChainInstruction
> = (instr, init, who) => {
  const anim = animatePlans(init, who, (d) => planRobinsChain(instr, d));
  return [
    {
      dur: instr.beats,
      position: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).pos,
      facing: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).facing,
      hands: (dancer, frac) =>
        dancer.at(anim.getFrame(instr.beats * frac)).hands,
      interactedWith: (dancer) => dancer.at(anim.getFrame(instr.beats)).recents,
    },
  ];
};

function getCatchInfo(instr: RobinsChainInstruction, dancer: Dancer) {
  if (dancer.role === "robin")
    return getCatchInfo(instr, getReceiver(instr, dancer));

  const sent = getSendee(dancer);
  const midpointWithSent = avgPos(dancer, sent);
  const towardSent = getDir({ from: dancer.pos, to: sent.pos });

  return {
    midpoint: midpointWithSent,
    facing: towardSent.rotateByDegrees(-90),
    larkAt: midpointWithSent.add(towardSent.multiply(0.35)),
    robinAt: midpointWithSent.add(towardSent.multiply(-0.35)),
  };
}

function planRobinsChainForLark(
  instr: RobinsChainInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const halfBeats = instr.beats / 2;

  const catchInfo = getCatchInfo(instr, dancer);

  const sent = getSendee(dancer);
  const receiving: Dancer = getSendee(getReceiver(instr, getSendee(dancer)));

  const sidestepSegment = {
    dur: halfBeats,
    position: (frac) => lerpVectors(dancer.pos, catchInfo.larkAt, frac),
    facing: (frac) =>
      lerpFacing(dancer.facing, catchInfo.facing, frac, { forceDir: "ccw" }),
    hands: () => ({ left: undefined, right: undefined }),
    interactedWith: () => [sent.id],
  } satisfies DancerSegment;

  const courtesyTurnSegments = planCourtesyTurnWithResolvedMatch(
    { beats: halfBeats },
    produce(dancer, (draft) => {
      draft.pos = catchInfo.larkAt;
      draft.facing = catchInfo.facing;
    }),
    produce(receiving, (draft) => {
      draft.pos = catchInfo.robinAt;
      draft.facing = catchInfo.facing;
    }),
  );

  return [sidestepSegment, ...courtesyTurnSegments];
}

function planRobinsChainForRobin(
  instr: RobinsChainInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const halfBeats = instr.beats / 2;
  const quarterBeats = instr.beats / 4;

  const catchInfo = getCatchInfo(instr, dancer);

  const receiver = getReceiver(instr, dancer);
  const receiverSendee = getSendee(receiver);

  const passMidpoint = avgPos(dancer, receiverSendee);
  const passFacing = getDir({ from: dancer.pos, to: passMidpoint });
  const approachSegment = {
    dur: quarterBeats,
    position: (frac) =>
      lerpVectors(
        dancer.pos,
        passMidpoint.add(
          getDir({ from: dancer.pos, to: passMidpoint })
            .multiply(0.25)
            .rotateByDegrees(90),
        ),
        frac,
      ),
    facing: () => passFacing,
  } satisfies DancerSegment;
  const postApproach = {
    pos: approachSegment.position(1),
    facing: approachSegment.facing(),
  };

  const passRevolveRadians = -PI / 2; // TODO: revolve until dancer or receiverSendee is facing their caughtAt
  const passSegment = {
    dur: quarterBeats / 2,
    position: (frac) =>
      revolve(postApproach.pos, {
        around: passMidpoint,
        radians: passRevolveRadians * frac,
      }),
    facing: (frac) => passFacing.rotateByRadians(passRevolveRadians * frac),
    hands: () => ({
      left: undefined,
      right: { theirId: receiverSendee.id, theirHand: "right" },
    }),
  } satisfies DancerSegment;
  const postPass = {
    pos: passSegment.position(1),
    facing: passSegment.facing(1),
  };

  const catchSegment = {
    dur: quarterBeats / 2,
    position: (frac) => lerpVectors(postPass.pos, catchInfo.robinAt, frac),
    facing: (frac) =>
      lerpFacing(catchInfo.facing, catchInfo.facing, frac, { forceDir: "ccw" }),
    hands: () => ({}),
  } satisfies DancerSegment;

  const courtesyTurnSegments = planCourtesyTurnWithResolvedMatch(
    { beats: halfBeats },
    produce(dancer, (draft) => {
      draft.pos = catchInfo.robinAt;
      draft.facing = catchInfo.facing;
    }),
    produce(receiver, (draft) => {
      draft.pos = catchInfo.larkAt;
      draft.facing = catchInfo.facing;
    }),
  );

  // const courtesyTurnSegment = {
  //   dur: halfBeats,
  //   position: (frac) => revolve(postCatch.pos, { around: catchInfo.midpoint, radians: PI * frac }),
  //   facing: (frac) => postCatch.facing.rotateByRadians(PI*frac),
  //   hands: () => ({left: {theirId: receiver.id, theirHand: "left"}, right: {theirId: receiver.id, theirHand: "right"}}),
  // } satisfies DancerSegment;

  return [approachSegment, passSegment, catchSegment, ...courtesyTurnSegments];
}

// ── Plan-based API (top-level instruction) ──────────────────────────────

export function planRobinsChain(
  instr: RobinsChainInstruction,
  dancer: Dancer,
): DancerSegment[] {
  switch (dancer.role) {
    case "robin":
      return planRobinsChainForRobin(instr, dancer);
    case "lark":
      return planRobinsChainForLark(instr, dancer);
    default:
      assertNever(dancer.role);
  }
}

/**
 * Animate a robins chain using per-dancer plans.
 *
 * Each dancer gets their own DancerSegment[] with closures that know the
 * dancer's identity, targets, and partners. No `dancer` parameter needed.
 */
export function robinsChainAnimator(
  instr: RobinsChainInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planRobinsChain(instr, dancer));
}
