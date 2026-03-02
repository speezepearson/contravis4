import { z } from "zod";

import { type Animator } from "./_base";
import { allemandeAnimator, AllemandeInstructionSchema } from "./allemande";
import { balanceAnimator, BalanceInstructionSchema } from "./balance";
import { boxTheGnatAnimator, BoxTheGnatInstructionSchema } from "./boxTheGnat";
import {
  californiaTwirlAnimator,
  CaliforniaTwirlInstructionSchema,
} from "./californiaTwirl";
import { doSiDoAnimator, DoSiDoInstructionSchema } from "./doSiDo";
import { dropHandsAnimator, DropHandsInstructionSchema } from "./dropHands";
import {
  formShortWavesAnimator,
  FormShortWavesInstructionSchema,
} from "./formShortWaves";
import {
  giveAndTakeIntoSwingAnimator,
  GiveAndTakeIntoSwingInstructionSchema,
} from "./giveAndTakeIntoSwing";
import { pullByAnimator, PullByInstructionSchema } from "./pullBy";
import { stepAnimator, StepInstructionSchema } from "./step";
import { swingAnimator, SwingInstructionSchema } from "./swing";
import { takeHandsAnimator, TakeHandsInstructionSchema } from "./takeHands";

export const AtomicInstructionSchema = z.discriminatedUnion("type", [
  AllemandeInstructionSchema,
  BalanceInstructionSchema,
  BoxTheGnatInstructionSchema,
  CaliforniaTwirlInstructionSchema,
  DoSiDoInstructionSchema,
  DropHandsInstructionSchema,
  FormShortWavesInstructionSchema,
  GiveAndTakeIntoSwingInstructionSchema,
  PullByInstructionSchema,
  StepInstructionSchema,
  SwingInstructionSchema,
  TakeHandsInstructionSchema,
]);
export type AtomicInstruction = z.infer<typeof AtomicInstructionSchema>;

/** Registry mapping each atomic instruction type to its animator. */
export const atomicInstructionAnimators: {
  [K in AtomicInstruction["type"]]: (
    instr: Extract<AtomicInstruction, { type: K }>,
  ) => Animator;
} = {
  allemande: allemandeAnimator,
  balance: balanceAnimator,
  box_the_gnat: boxTheGnatAnimator,
  california_twirl: californiaTwirlAnimator,
  do_si_do: doSiDoAnimator,
  drop_hands: dropHandsAnimator,
  form_short_waves: formShortWavesAnimator,
  give_and_take_into_swing: giveAndTakeIntoSwingAnimator,
  pull_by: pullByAnimator,
  step: stepAnimator,
  take_hands: takeHandsAnimator,
  swing: swingAnimator,
};
export function makeAtomicInstructionAnimator(
  instr: AtomicInstruction,
): Animator {
  const makeAnimator = atomicInstructionAnimators[instr.type] as (
    _: typeof instr,
  ) => Animator;
  return makeAnimator(instr);
}
