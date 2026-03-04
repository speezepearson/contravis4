import { z } from "zod";

import { type Animator } from "./_base";
import { type SegmentAnimator, toAnimator } from "./_segment";
import { AllemandeInstructionSchema, allemandeSegments } from "./allemande";
import { BalanceInstructionSchema, balanceSegments } from "./balance";
import {
  BalanceTheRingInstructionSchema,
  balanceTheRingSegments,
} from "./balanceTheRing";
import {
  BoxCirculateInstructionSchema,
  boxCirculateSegments,
} from "./boxCirculate";
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
  FormLongWavesInstructionSchema,
  formLongWavesSegments,
} from "./formLongWaves";
import {
  FormShortWavesInstructionSchema,
  formShortWavesSegments,
} from "./formShortWaves";
import {
  GiveAndTakeIntoSwingInstructionSchema,
  giveAndTakeIntoSwingSegments,
} from "./giveAndTakeIntoSwing";
import { PassByInstructionSchema, passBySegments } from "./passBy";
import { PetronellaInstructionSchema, petronellaSegments } from "./petronella";
import { PullByInstructionSchema, pullBySegments } from "./pullBy";
import { RelabelInstructionSchema, relabelSegments } from "./relabel";
import { RollAwayInstructionSchema, rollAwaySegments } from "./rollAway";
import { RoryOMoreInstructionSchema, roryOMoreSegments } from "./roryOMore";
import {
  ShoulderRoundInstructionSchema,
  shoulderRoundSegments,
} from "./shoulderRound";
import {
  SquareThroughInstructionSchema,
  squareThroughSegments,
} from "./squareThrough";
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
  BalanceTheRingInstructionSchema,
  BoxCirculateInstructionSchema,
  BoxTheGnatInstructionSchema,
  CaliforniaTwirlInstructionSchema,
  CircleInstructionSchema,
  DoSiDoInstructionSchema,
  DropHandsInstructionSchema,
  FaceInstructionSchema,
  FormLongWavesInstructionSchema,
  FormShortWavesInstructionSchema,
  GiveAndTakeIntoSwingInstructionSchema,
  PassByInstructionSchema,
  PetronellaInstructionSchema,
  PullByInstructionSchema,
  RelabelInstructionSchema,
  RollAwayInstructionSchema,
  RoryOMoreInstructionSchema,
  ShoulderRoundInstructionSchema,
  SquareThroughInstructionSchema,
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
  balance_the_ring: balanceTheRingSegments,
  box_circulate: boxCirculateSegments,
  box_the_gnat: boxTheGnatSegments,
  california_twirl: californiaTwirlSegments,
  circle: circleSegments,
  do_si_do: doSiDoSegments,
  drop_hands: dropHandsSegments,
  face: faceSegments,
  form_long_waves: formLongWavesSegments,
  form_short_waves: formShortWavesSegments,
  give_and_take_into_swing: giveAndTakeIntoSwingSegments,
  pass_by: passBySegments,
  petronella: petronellaSegments,
  pull_by: pullBySegments,
  relabel: relabelSegments,
  roll_away: rollAwaySegments,
  rory_o_more: roryOMoreSegments,
  shoulder_round: shoulderRoundSegments,
  square_through: squareThroughSegments,
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
