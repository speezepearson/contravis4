import { z } from "zod";

import type { ProtoId } from "../contraCore";
import type { WorldState } from "../worldState";
import { type ContraAnimation } from "./_base";
import { animateSegments, type Segment } from "./_segment";
import {
  allemandeAnimator,
  AllemandeInstructionSchema,
  allemandeSegments,
} from "./allemande";
import {
  balanceAnimator,
  BalanceInstructionSchema,
  balanceSegments,
} from "./balance";
import {
  BalanceAndSwingInstructionSchema,
  balanceAndSwingSegments,
} from "./balanceAndSwing";
import {
  balanceTheRingAnimator,
  BalanceTheRingInstructionSchema,
  balanceTheRingSegments,
} from "./balanceTheRing";
import {
  bendTheLineAnimator,
  BendTheLineInstructionSchema,
  bendTheLineSegments,
} from "./bendTheLine";
import {
  boxCirculateAnimator,
  BoxCirculateInstructionSchema,
  boxCirculateSegments,
} from "./boxCirculate";
import {
  boxTheGnatAnimator,
  BoxTheGnatInstructionSchema,
  boxTheGnatSegments,
} from "./boxTheGnat";
import {
  californiaTwirlAnimator,
  CaliforniaTwirlInstructionSchema,
  californiaTwirlSegments,
} from "./californiaTwirl";
import { CircleInstructionSchema, circleSegments } from "./circle";
import {
  doSiDoAnimator,
  DoSiDoInstructionSchema,
  doSiDoSegments,
} from "./doSiDo";
import {
  downTheHallAnimator,
  DownTheHallInstructionSchema,
  downTheHallSegments,
} from "./downTheHall";
import {
  dropHandsAnimator,
  DropHandsInstructionSchema,
  dropHandsSegments,
} from "./dropHands";
import { faceAnimator, FaceInstructionSchema, faceSegments } from "./face";
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
  greetNewNeighborsAnimator,
  GreetNewNeighborsInstructionSchema,
  greetNewNeighborsSegments,
} from "./greetNewNeighbors";
import {
  greetShadowAnimator,
  GreetShadowInstructionSchema,
  greetShadowSegments,
} from "./greetShadow";
import { HeyInstructionSchema, heySegments } from "./hey";
import {
  longLineInCenterAnimator,
  LongLineInCenterInstructionSchema,
  longLineInCenterSegments,
} from "./longLineInCenter";
import {
  LongLinesForwardBackInstructionSchema,
  longLinesForwardBackSegments,
} from "./longLinesForwardBack";
import {
  madRobinAnimator,
  MadRobinInstructionSchema,
  madRobinSegments,
} from "./madRobin";
import {
  MeltdownSwingInstructionSchema,
  meltdownSwingSegments,
} from "./meltdownSwing";
import {
  passByAnimator,
  PassByInstructionSchema,
  passBySegments,
} from "./passBy";
import {
  petronellaAnimator,
  PetronellaInstructionSchema,
  petronellaSegments,
} from "./petronella";
import {
  poussetteAnimator,
  PoussetteInstructionSchema,
  poussetteSegments,
} from "./poussette";
import {
  pullByAnimator,
  PullByInstructionSchema,
  pullBySegments,
} from "./pullBy";
import {
  RightLeftThroughInstructionSchema,
  rightLeftThroughSegments,
} from "./rightLeftThrough";
import {
  rollAwayAnimator,
  RollAwayInstructionSchema,
  rollAwaySegments,
} from "./rollAway";
import {
  roryOMoreAnimator,
  RoryOMoreInstructionSchema,
  roryOMoreSegments,
} from "./roryOMore";
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
  squareThroughAnimator,
  SquareThroughInstructionSchema,
  squareThroughSegments,
} from "./squareThrough";
import { StarInstructionSchema, starSegments } from "./star";
import { stepAnimator, StepInstructionSchema, stepSegments } from "./step";
import {
  takeHandsAnimator,
  TakeHandsInstructionSchema,
  takeHandsSegments,
} from "./takeHands";
import {
  takeHandsInRingsAnimator,
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
import {
  turnAloneAnimator,
  TurnAloneInstructionSchema,
  turnAloneSegments,
} from "./turnAlone";
import {
  turnAsACoupleAnimator,
  TurnAsACoupleInstructionSchema,
  turnAsACoupleSegments,
} from "./turnAsACouple";
import {
  upTheHallAnimator,
  UpTheHallInstructionSchema,
  upTheHallSegments,
} from "./upTheHall";
import {
  zigZagAnimator,
  ZigZagInstructionSchema,
  zigZagSegments,
} from "./zigZag";

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

export function animateAtomicInstruction(
  instr: AtomicInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  switch (instr.type) {
    case "allemande":
      return allemandeAnimator(instr, init, who);
    case "balance":
      return balanceAnimator(instr, init, who);
    case "balance_the_ring":
      return balanceTheRingAnimator(instr, init, who);
    case "bend_the_line":
      return bendTheLineAnimator(instr, init, who);
    case "box_circulate":
      return boxCirculateAnimator(instr, init, who);
    case "box_the_gnat":
      return boxTheGnatAnimator(instr, init, who);
    case "california_twirl":
      return californiaTwirlAnimator(instr, init, who);
    case "do_si_do":
      return doSiDoAnimator(instr, init, who);
    case "down_the_hall":
      return downTheHallAnimator(instr, init, who);
    case "drop_hands":
      return dropHandsAnimator(instr, init, who);
    case "face":
      return faceAnimator(instr, init, who);
    case "greet_new_neighbors":
      return greetNewNeighborsAnimator(instr, init, who);
    case "greet_shadow":
      return greetShadowAnimator(instr, init, who);
    case "long_line_in_center":
      return longLineInCenterAnimator(instr, init, who);
    case "mad_robin":
      return madRobinAnimator(instr, init, who);
    case "petronella":
      return petronellaAnimator(instr, init, who);
    case "poussette":
      return poussetteAnimator(instr, init, who);
    case "pass_by":
      return passByAnimator(instr, init, who);
    case "pull_by":
      return pullByAnimator(instr, init, who);
    case "roll_away":
      return rollAwayAnimator(instr, init, who);
    case "rory_o_more":
      return roryOMoreAnimator(instr, init, who);
    case "square_through":
      return squareThroughAnimator(instr, init, who);
    case "step":
      return stepAnimator(instr, init, who);
    case "take_hands":
      return takeHandsAnimator(instr, init, who);
    case "take_hands_in_rings":
      return takeHandsInRingsAnimator(instr, init, who);
    case "turn_alone":
      return turnAloneAnimator(instr, init, who);
    case "turn_as_a_couple":
      return turnAsACoupleAnimator(instr, init, who);
    case "up_the_hall":
      return upTheHallAnimator(instr, init, who);
    case "zig_zag":
      return zigZagAnimator(instr, init, who);
    default:
      return animateSegments(
        init,
        who,
        makeAtomicInstructionSegments(instr, init, who),
      );
  }
}
