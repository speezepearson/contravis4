import { z } from "zod";

import { type Animator } from "./_base";
import { type SegmentAnimator, toAnimator } from "./_segment";
import { AllemandeInstructionSchema, allemandeSegments } from "./allemande";
import { BalanceInstructionSchema, balanceSegments } from "./balance";
import { BoxTheGnatInstructionSchema, boxTheGnatSegments } from "./boxTheGnat";
import {
  CaliforniaTwirlInstructionSchema,
  californiaTwirlSegments,
} from "./californiaTwirl";
import { CircleInstructionSchema, circleSegments } from "./circle";
import { DoSiDoInstructionSchema, doSiDoSegments } from "./doSiDo";
import { DropHandsInstructionSchema, dropHandsSegments } from "./dropHands";
import { FaceInstructionSchema, faceSegments } from "./face";
import {
  FormShortWavesInstructionSchema,
  formShortWavesSegments,
} from "./formShortWaves";
import {
  GiveAndTakeIntoSwingInstructionSchema,
  giveAndTakeIntoSwingSegments,
} from "./giveAndTakeIntoSwing";
import { PassByInstructionSchema, passBySegments } from "./passBy";
import { PullByInstructionSchema, pullBySegments } from "./pullBy";
import { RelabelInstructionSchema, relabelSegments } from "./relabel";
import { RollAwayInstructionSchema, rollAwaySegments } from "./rollAway";
import { StepInstructionSchema, stepSegments } from "./step";
import { SwingInstructionSchema, swingSegments } from "./swing";
import { TakeHandsInstructionSchema, takeHandsSegments } from "./takeHands";
import {
  TakeHandsInRingsInstructionSchema,
  takeHandsInRingsSegments,
} from "./takeHandsInRings";

export const AtomicInstructionSchema = z.discriminatedUnion("type", [
  AllemandeInstructionSchema,
  BalanceInstructionSchema,
  BoxTheGnatInstructionSchema,
  CaliforniaTwirlInstructionSchema,
  CircleInstructionSchema,
  DoSiDoInstructionSchema,
  DropHandsInstructionSchema,
  FaceInstructionSchema,
  FormShortWavesInstructionSchema,
  GiveAndTakeIntoSwingInstructionSchema,
  PassByInstructionSchema,
  PullByInstructionSchema,
  RelabelInstructionSchema,
  RollAwayInstructionSchema,
  StepInstructionSchema,
  SwingInstructionSchema,
  TakeHandsInRingsInstructionSchema,
  TakeHandsInstructionSchema,
]);
export type AtomicInstruction = z.infer<typeof AtomicInstructionSchema>;

/** Registry mapping each atomic instruction type to its segment animator. */
export const atomicSegmentAnimators: {
  [K in AtomicInstruction["type"]]: (
    instr: Extract<AtomicInstruction, { type: K }>,
  ) => SegmentAnimator;
} = {
  allemande: allemandeSegments,
  balance: balanceSegments,
  box_the_gnat: boxTheGnatSegments,
  california_twirl: californiaTwirlSegments,
  circle: circleSegments,
  do_si_do: doSiDoSegments,
  drop_hands: dropHandsSegments,
  face: faceSegments,
  form_short_waves: formShortWavesSegments,
  give_and_take_into_swing: giveAndTakeIntoSwingSegments,
  pass_by: passBySegments,
  pull_by: pullBySegments,
  relabel: relabelSegments,
  roll_away: rollAwaySegments,
  step: stepSegments,
  swing: swingSegments,
  take_hands_in_rings: takeHandsInRingsSegments,
  take_hands: takeHandsSegments,
};

export function makeAtomicSegmentAnimator(
  instr: AtomicInstruction,
): SegmentAnimator {
  const makeSegments = atomicSegmentAnimators[instr.type] as (
    _: typeof instr,
  ) => SegmentAnimator;
  return makeSegments(instr);
}

export function makeAtomicInstructionAnimator(
  instr: AtomicInstruction,
): Animator {
  return toAnimator(makeAtomicSegmentAnimator(instr));
}
