import { z } from "zod";

import type { ProtoId } from "../contraCore";
import type { WorldState } from "../worldState";
import { type InstructionAnimator, type Segment } from "./_segment";
import { AllemandeInstructionSchema, allemandeSegments } from "./allemande";
import { BalanceInstructionSchema, balanceSegments } from "./balance";
import {
  BalanceAndSwingInstructionSchema,
  balanceAndSwingSegments,
} from "./balanceAndSwing";
import {
  BalanceTheRingInstructionSchema,
  balanceTheRingSegments,
} from "./balanceTheRing";
import {
  BendTheLineInstructionSchema,
  bendTheLineSegments,
} from "./bendTheLine";
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
import {
  DownTheHallInstructionSchema,
  downTheHallSegments,
} from "./downTheHall";
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
  GreetNewNeighborsInstructionSchema,
  greetNewNeighborsSegments,
} from "./greetNewNeighbors";
import {
  GreetShadowInstructionSchema,
  greetShadowSegments,
} from "./greetShadow";
import {
  LongLineInCenterInstructionSchema,
  longLineInCenterSegments,
} from "./longLineInCenter";
import {
  LongLinesForwardBackInstructionSchema,
  longLinesForwardBackSegments,
} from "./longLinesForwardBack";
import { MadRobinInstructionSchema, madRobinSegments } from "./madRobin";
import { PassByInstructionSchema, passBySegments } from "./passBy";
import { PetronellaInstructionSchema, petronellaSegments } from "./petronella";
import { PoussetteInstructionSchema, poussetteSegments } from "./poussette";
import { PullByInstructionSchema, pullBySegments } from "./pullBy";
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
import { UpTheHallInstructionSchema, upTheHallSegments } from "./upTheHall";
import { ZigZagInstructionSchema, zigZagSegments } from "./zigZag";

export const AtomicInstructionSchema = z.discriminatedUnion("type", [
  AllemandeInstructionSchema,
  BalanceAndSwingInstructionSchema,
  BalanceInstructionSchema,
  BalanceTheRingInstructionSchema,
  BendTheLineInstructionSchema,
  BoxCirculateInstructionSchema,
  BoxTheGnatInstructionSchema,
  CaliforniaTwirlInstructionSchema,
  CircleInstructionSchema,
  DoSiDoInstructionSchema,
  DownTheHallInstructionSchema,
  DropHandsInstructionSchema,
  FaceInstructionSchema,
  FormLongWavesInstructionSchema,
  FormShortWavesInstructionSchema,
  GiveAndTakeIntoSwingInstructionSchema,
  GreetNewNeighborsInstructionSchema,
  GreetShadowInstructionSchema,
  LongLineInCenterInstructionSchema,
  LongLinesForwardBackInstructionSchema,
  MadRobinInstructionSchema,
  PassByInstructionSchema,
  PetronellaInstructionSchema,
  PoussetteInstructionSchema,
  PullByInstructionSchema,
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
  UpTheHallInstructionSchema,
  ZigZagInstructionSchema,
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
  balance_and_swing: balanceAndSwingSegments,
  balance_the_ring: balanceTheRingSegments,
  bend_the_line: bendTheLineSegments,
  box_circulate: boxCirculateSegments,
  box_the_gnat: boxTheGnatSegments,
  california_twirl: californiaTwirlSegments,
  circle: circleSegments,
  do_si_do: doSiDoSegments,
  down_the_hall: downTheHallSegments,
  drop_hands: dropHandsSegments,
  face: faceSegments,
  form_long_waves: formLongWavesSegments,
  form_short_waves: formShortWavesSegments,
  give_and_take_into_swing: giveAndTakeIntoSwingSegments,
  greet_new_neighbors: greetNewNeighborsSegments,
  greet_shadow: greetShadowSegments,
  long_line_in_center: longLineInCenterSegments,
  long_lines_forward_back: longLinesForwardBackSegments,
  mad_robin: madRobinSegments,
  pass_by: passBySegments,
  petronella: petronellaSegments,
  poussette: poussetteSegments,
  pull_by: pullBySegments,
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
  up_the_hall: upTheHallSegments,
  zig_zag: zigZagSegments,
};

export function makeAtomicInstructionSegments(
  instr: AtomicInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): Segment[] {
  const segAnimator = atomicSegmentAnimators[instr.type] as InstructionAnimator<
    typeof instr
  >;
  return segAnimator(instr, init, who);
}
