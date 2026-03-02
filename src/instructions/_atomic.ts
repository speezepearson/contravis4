import { z } from "zod";
import { allemandeAnimator, AllemandeInstructionSchema } from "./allemande";
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
import { type InstructionAnimator, type ContraAnimation } from "./_base";
import type { ProtoId } from "../contraCore";
import type { WorldState } from "../worldState";
import { balanceAnimator, BalanceInstructionSchema } from "./balance";

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
  [K in AtomicInstruction["type"]]: InstructionAnimator<
    Extract<AtomicInstruction, { type: K }>
  >;
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
export function animateAtomicInstruction(
  init: WorldState,
  who: Set<ProtoId>,
  instr: AtomicInstruction,
): ContraAnimation {
  const animator = atomicInstructionAnimators[
    instr.type
  ] as InstructionAnimator<typeof instr>;
  return animator(init, who, instr);
}
