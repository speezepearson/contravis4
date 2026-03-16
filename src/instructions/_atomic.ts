import { z } from "zod";

import type { ProtoId } from "../contraCore";
import type { WorldState } from "../worldState";
import { type ContraAnimation } from "./_base";
import { allemandeAnimator, AllemandeInstructionSchema } from "./allemande";
import { balanceAnimator, BalanceInstructionSchema } from "./balance";
import {
  balanceAndSwingAnimator,
  BalanceAndSwingInstructionSchema,
} from "./balanceAndSwing";
import {
  balanceTheRingAnimator,
  BalanceTheRingInstructionSchema,
} from "./balanceTheRing";
import {
  bendTheLineAnimator,
  BendTheLineInstructionSchema,
} from "./bendTheLine";
import {
  boxCirculateAnimator,
  BoxCirculateInstructionSchema,
} from "./boxCirculate";
import { boxTheGnatAnimator, BoxTheGnatInstructionSchema } from "./boxTheGnat";
import {
  californiaTwirlAnimator,
  CaliforniaTwirlInstructionSchema,
} from "./californiaTwirl";
import { circleAnimator, CircleInstructionSchema } from "./circle";
import { doSiDoAnimator, DoSiDoInstructionSchema } from "./doSiDo";
import {
  downTheHallAnimator,
  DownTheHallInstructionSchema,
} from "./downTheHall";
import { dropHandsAnimator, DropHandsInstructionSchema } from "./dropHands";
import { faceAnimator, FaceInstructionSchema } from "./face";
import {
  formLongWavesAnimator,
  FormLongWavesInstructionSchema,
} from "./formLongWaves";
import {
  formShortWavesAnimator,
  FormShortWavesInstructionSchema,
} from "./formShortWaves";
import {
  giveAndTakeIntoSwingAnimator,
  GiveAndTakeIntoSwingInstructionSchema,
} from "./giveAndTakeIntoSwing";
import {
  greetNewNeighborsAnimator,
  GreetNewNeighborsInstructionSchema,
} from "./greetNewNeighbors";
import {
  greetShadowAnimator,
  GreetShadowInstructionSchema,
} from "./greetShadow";
import { heyAnimator, HeyInstructionSchema } from "./hey";
import {
  longLineInCenterAnimator,
  LongLineInCenterInstructionSchema,
} from "./longLineInCenter";
import {
  longLinesForwardBackAnimator,
  LongLinesForwardBackInstructionSchema,
} from "./longLinesForwardBack";
import { madRobinAnimator, MadRobinInstructionSchema } from "./madRobin";
import {
  meltdownSwingAnimator,
  MeltdownSwingInstructionSchema,
} from "./meltdownSwing";
import { passByAnimator, PassByInstructionSchema } from "./passBy";
import { petronellaAnimator, PetronellaInstructionSchema } from "./petronella";
import { poussetteAnimator, PoussetteInstructionSchema } from "./poussette";
import { pullByAnimator, PullByInstructionSchema } from "./pullBy";
import {
  rightLeftThroughAnimator,
  RightLeftThroughInstructionSchema,
} from "./rightLeftThrough";
import {
  robinsChainAnimator,
  RobinsChainInstructionSchema,
} from "./robinsChain";
import { rollAwayAnimator, RollAwayInstructionSchema } from "./rollAway";
import { roryOMoreAnimator, RoryOMoreInstructionSchema } from "./roryOMore";
import {
  shoulderRoundAnimator,
  ShoulderRoundInstructionSchema,
} from "./shoulderRound";
import {
  singleFilePromenadeAnimator,
  SingleFilePromenadeInstructionSchema,
} from "./singleFilePromenade";
import { sliceAnimator, SliceInstructionSchema } from "./slice";
import {
  squareThroughAnimator,
  SquareThroughInstructionSchema,
} from "./squareThrough";
import { starAnimator, StarInstructionSchema } from "./star";
import { stepAnimator, StepInstructionSchema } from "./step";
import { swingAnimator, SwingInstructionSchema } from "./swing";
import { takeHandsAnimator, TakeHandsInstructionSchema } from "./takeHands";
import {
  takeHandsInRingsAnimator,
  TakeHandsInRingsInstructionSchema,
} from "./takeHandsInRings";
import {
  templatedLLRRAnimator,
  TemplatedLLRRInstructionSchema,
} from "./templatedLLRRInstruction";
import {
  templatedLRAnimator,
  TemplatedLRInstructionSchema,
} from "./templatedLRInstruction";
import { turnAloneAnimator, TurnAloneInstructionSchema } from "./turnAlone";
import {
  turnAsACoupleAnimator,
  TurnAsACoupleInstructionSchema,
} from "./turnAsACouple";
import { upTheHallAnimator, UpTheHallInstructionSchema } from "./upTheHall";
import { zigZagAnimator, ZigZagInstructionSchema } from "./zigZag";

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
  RobinsChainInstructionSchema,
  RollAwayInstructionSchema,
  RoryOMoreInstructionSchema,
  ShoulderRoundInstructionSchema,
  SingleFilePromenadeInstructionSchema,
  SliceInstructionSchema,
  SquareThroughInstructionSchema,
  StarInstructionSchema,
  StepInstructionSchema,
  SwingInstructionSchema,
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
    case "balance_and_swing":
      return balanceAndSwingAnimator(instr, init, who);
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
    case "form_long_waves":
      return formLongWavesAnimator(instr, init, who);
    case "form_short_waves":
      return formShortWavesAnimator(instr, init, who);
    case "give_and_take_into_swing":
      return giveAndTakeIntoSwingAnimator(instr, init, who);
    case "greet_new_neighbors":
      return greetNewNeighborsAnimator(instr, init, who);
    case "greet_shadow":
      return greetShadowAnimator(instr, init, who);
    case "hey":
      return heyAnimator(instr, init, who);
    case "long_line_in_center":
      return longLineInCenterAnimator(instr, init, who);
    case "long_lines_forward_back":
      return longLinesForwardBackAnimator(instr, init, who);
    case "meltdown_swing":
      return meltdownSwingAnimator(instr, init, who);
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
    case "right_left_through":
      return rightLeftThroughAnimator(instr, init, who);
    case "robins_chain":
      return robinsChainAnimator(instr, init, who);
    case "roll_away":
      return rollAwayAnimator(instr, init, who);
    case "rory_o_more":
      return roryOMoreAnimator(instr, init, who);
    case "shoulder_round":
      return shoulderRoundAnimator(instr, init, who);
    case "single_file_promenade":
      return singleFilePromenadeAnimator(instr, init, who);
    case "slice":
      return sliceAnimator(instr, init, who);
    case "square_through":
      return squareThroughAnimator(instr, init, who);
    case "star":
      return starAnimator(instr, init, who);
    case "step":
      return stepAnimator(instr, init, who);
    case "swing":
      return swingAnimator(instr, init, who);
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
    case "templated_llrr":
      return templatedLLRRAnimator(instr, init, who);
    case "templated_lr":
      return templatedLRAnimator(instr, init, who);
    case "circle":
      return circleAnimator(instr, init, who);
  }
}
