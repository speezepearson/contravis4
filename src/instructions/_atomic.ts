import { z } from "zod";

import type { ProtoId } from "../contraCore";
import type { WorldState } from "../worldState";
import { type Segment } from "./_segment";
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
import { HeyInstructionSchema, heySegments } from "./hey";
import {
  LongLineInCenterInstructionSchema,
  longLineInCenterSegments,
} from "./longLineInCenter";
import {
  LongLinesForwardBackInstructionSchema,
  longLinesForwardBackSegments,
} from "./longLinesForwardBack";
import { MadRobinInstructionSchema, madRobinSegments } from "./madRobin";
import {
  MeltdownSwingInstructionSchema,
  meltdownSwingSegments,
} from "./meltdownSwing";
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
  SingleFilePromenadeInstructionSchema,
  singleFilePromenadeSegments,
} from "./singleFilePromenade";
import { SliceInstructionSchema, sliceSegments } from "./slice";
import {
  SquareThroughInstructionSchema,
  squareThroughSegments,
} from "./squareThrough";
import { StarInstructionSchema, starSegments } from "./star";
import { StepInstructionSchema, stepSegments } from "./step";
import { TakeHandsInstructionSchema, takeHandsSegments } from "./takeHands";
import {
  TakeHandsInRingsInstructionSchema,
  takeHandsInRingsSegments,
} from "./takeHandsInRings";
import {
  TemplatedLLRRInstructionSchema,
  templatedLLRRSegments,
} from "./templatedLLRRInstruction";
import {
  TemplatedLRInstructionSchema,
  templatedLRSegments,
} from "./templatedLRInstruction";
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
  HeyInstructionSchema,
  GreetNewNeighborsInstructionSchema,
  GreetShadowInstructionSchema,
  LongLineInCenterInstructionSchema,
  LongLinesForwardBackInstructionSchema,
  MadRobinInstructionSchema,
  MeltdownSwingInstructionSchema,
  PassByInstructionSchema,
  PetronellaInstructionSchema,
  PoussetteInstructionSchema,
  PullByInstructionSchema,
  RightLeftThroughInstructionSchema,
  RollAwayInstructionSchema,
  RoryOMoreInstructionSchema,
  ShoulderRoundInstructionSchema,
  SingleFilePromenadeInstructionSchema,
  SliceInstructionSchema,
  SquareThroughInstructionSchema,
  StarInstructionSchema,
  StepInstructionSchema,
  TakeHandsInRingsInstructionSchema,
  TakeHandsInstructionSchema,
  TemplatedLLRRInstructionSchema,
  TemplatedLRInstructionSchema,
  TurnAloneInstructionSchema,
  TurnAsACoupleInstructionSchema,
  UpTheHallInstructionSchema,
  ZigZagInstructionSchema,
]);
export type AtomicInstruction = z.infer<typeof AtomicInstructionSchema>;

export function makeAtomicInstructionSegments(
  instr: AtomicInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): Segment[] {
  switch (instr.type) {
    case "allemande":
      return allemandeSegments(instr, init, who);
    case "balance":
      return balanceSegments(instr, init, who);
    case "balance_and_swing":
      return balanceAndSwingSegments(instr, init, who);
    case "balance_the_ring":
      return balanceTheRingSegments(instr, init, who);
    case "bend_the_line":
      return bendTheLineSegments(instr, init, who);
    case "box_circulate":
      return boxCirculateSegments(instr, init, who);
    case "box_the_gnat":
      return boxTheGnatSegments(instr, init, who);
    case "california_twirl":
      return californiaTwirlSegments(instr, init, who);
    case "circle":
      return circleSegments(instr, init, who);
    case "do_si_do":
      return doSiDoSegments(instr, init, who);
    case "down_the_hall":
      return downTheHallSegments(instr, init, who);
    case "drop_hands":
      return dropHandsSegments(instr, init, who);
    case "face":
      return faceSegments(instr, init, who);
    case "form_long_waves":
      return formLongWavesSegments(instr, init, who);
    case "form_short_waves":
      return formShortWavesSegments(instr, init, who);
    case "give_and_take_into_swing":
      return giveAndTakeIntoSwingSegments(instr, init, who);
    case "greet_new_neighbors":
      return greetNewNeighborsSegments(instr, init, who);
    case "greet_shadow":
      return greetShadowSegments(instr, init, who);
    case "hey":
      return heySegments(instr, init, who);
    case "long_line_in_center":
      return longLineInCenterSegments(instr, init, who);
    case "long_lines_forward_back":
      return longLinesForwardBackSegments(instr, init, who);
    case "mad_robin":
      return madRobinSegments(instr, init, who);
    case "meltdown_swing":
      return meltdownSwingSegments(instr, init, who);
    case "pass_by":
      return passBySegments(instr, init, who);
    case "petronella":
      return petronellaSegments(instr, init, who);
    case "poussette":
      return poussetteSegments(instr, init, who);
    case "pull_by":
      return pullBySegments(instr, init, who);
    case "right_left_through":
      return rightLeftThroughSegments(instr, init, who);
    case "roll_away":
      return rollAwaySegments(instr, init, who);
    case "rory_o_more":
      return roryOMoreSegments(instr, init, who);
    case "shoulder_round":
      return shoulderRoundSegments(instr, init, who);
    case "single_file_promenade":
      return singleFilePromenadeSegments(instr, init, who);
    case "slice":
      return sliceSegments(instr, init, who);
    case "square_through":
      return squareThroughSegments(instr, init, who);
    case "star":
      return starSegments(instr, init, who);
    case "step":
      return stepSegments(instr, init, who);
    case "take_hands":
      return takeHandsSegments(instr, init, who);
    case "take_hands_in_rings":
      return takeHandsInRingsSegments(instr, init, who);
    case "templated_llrr":
      return templatedLLRRSegments(instr, init, who);
    case "templated_lr":
      return templatedLRSegments(instr, init, who);
    case "turn_alone":
      return turnAloneSegments(instr, init, who);
    case "turn_as_a_couple":
      return turnAsACoupleSegments(instr, init, who);
    case "up_the_hall":
      return upTheHallSegments(instr, init, who);
    case "zig_zag":
      return zigZagSegments(instr, init, who);
  }
}
