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
import { DoSiDoInstructionSchema, doSiDoSegments } from "./doSiDo";
import { DropHandsInstructionSchema, dropHandsSegments } from "./dropHands";
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
import { StepInstructionSchema, stepSegments } from "./step";
import { SwingInstructionSchema, swingSegments } from "./swing";
import { TakeHandsInstructionSchema, takeHandsSegments } from "./takeHands";

export const AtomicInstructionSchema = z.discriminatedUnion("type", [
  AllemandeInstructionSchema,
  BalanceInstructionSchema,
  BoxTheGnatInstructionSchema,
  CaliforniaTwirlInstructionSchema,
  DoSiDoInstructionSchema,
  DropHandsInstructionSchema,
  FormShortWavesInstructionSchema,
  GiveAndTakeIntoSwingInstructionSchema,
  PassByInstructionSchema,
  PullByInstructionSchema,
  RelabelInstructionSchema,
  StepInstructionSchema,
  SwingInstructionSchema,
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
  do_si_do: doSiDoSegments,
  drop_hands: dropHandsSegments,
  form_short_waves: formShortWavesSegments,
  give_and_take_into_swing: giveAndTakeIntoSwingSegments,
  pass_by: passBySegments,
  pull_by: pullBySegments,
  relabel: relabelSegments,
  step: stepSegments,
  take_hands: takeHandsSegments,
  swing: swingSegments,
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
