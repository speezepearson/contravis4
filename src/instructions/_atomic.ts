import { z } from "zod";

import type { ProtoId } from "../contraCore";
import type { WorldState } from "../worldState";
import { type InstructionAnimator, type Segment } from "./_segment";
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
import {
  LongLineInCenterInstructionSchema,
  longLineInCenterSegments,
} from "./longLineInCenter";
import { MadRobinInstructionSchema, madRobinSegments } from "./madRobin";
import { PassByInstructionSchema, passBySegments } from "./passBy";
import { PetronellaInstructionSchema, petronellaSegments } from "./petronella";
import { PullByInstructionSchema, pullBySegments } from "./pullBy";
import { RelabelInstructionSchema, relabelSegments } from "./relabel";
import {
  RightLeftThroughInstructionSchema,
  rightLeftThroughSegments,
} from "./rightLeftThrough";
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
import { TurnAloneInstructionSchema, turnAloneSegments } from "./turnAlone";
import {
  TurnAsACoupleInstructionSchema,
  turnAsACoupleSegments,
} from "./turnAsACouple";

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
  LongLineInCenterInstructionSchema,
  MadRobinInstructionSchema,
  PassByInstructionSchema,
  PetronellaInstructionSchema,
  PullByInstructionSchema,
  RelabelInstructionSchema,
  RightLeftThroughInstructionSchema,
  RollAwayInstructionSchema,
  RoryOMoreInstructionSchema,
  ShoulderRoundInstructionSchema,
  SquareThroughInstructionSchema,
  StepInstructionSchema,
  SwingInstructionSchema,
  TakeHandsInRingsInstructionSchema,
  TakeHandsInstructionSchema,
  TurnAloneInstructionSchema,
  TurnAsACoupleInstructionSchema,
]);
export type AtomicInstruction = z.infer<typeof AtomicInstructionSchema>;

/** Registry mapping each atomic instruction type to its segment animator. */
export const atomicSegmentAnimators: {
  [K in AtomicInstruction["type"]]: InstructionAnimator<
    Extract<AtomicInstruction, { type: K }>
  >;
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
  long_line_in_center: longLineInCenterSegments,
  mad_robin: madRobinSegments,
  pass_by: passBySegments,
  petronella: petronellaSegments,
  pull_by: pullBySegments,
  relabel: relabelSegments,
  right_left_through: rightLeftThroughSegments,
  roll_away: rollAwaySegments,
  rory_o_more: roryOMoreSegments,
  shoulder_round: shoulderRoundSegments,
  square_through: squareThroughSegments,
  step: stepSegments,
  swing: swingSegments,
  take_hands_in_rings: takeHandsInRingsSegments,
  take_hands: takeHandsSegments,
  turn_alone: turnAloneSegments,
  turn_as_a_couple: turnAsACoupleSegments,
};

export function makeAtomicInstructionSegments(
  instr: AtomicInstruction,
  init: WorldState,
  who: Set<ProtoId>,
): Segment[] {
  const segAnimator = atomicSegmentAnimators[instr.type] as InstructionAnimator<
    typeof instr
  >;
  return segAnimator(instr, init, who);
}
