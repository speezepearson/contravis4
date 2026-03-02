import { z } from 'zod';
import { allemandeAnimator, AllemandeInstructionSchema } from './allemande';
import { boxTheGnatAnimator, BoxTheGnatInstructionSchema } from './boxTheGnat';
import { californiaTwirlAnimator, CaliforniaTwirlInstructionSchema } from './californiaTwirl';
import { dropHandsAnimator, DropHandsInstructionSchema } from './dropHands';
import { swingAnimator, SwingInstructionSchema } from './swing';
import { takeHandsAnimator, TakeHandsInstructionSchema } from './takeHands';
import { type InstructionAnimator, type ContraAnimation } from './_base';
import type { Beats, ProtoId } from '../contraCore';
import type { WorldState } from '../worldState';
import { balanceAnimator, BalanceInstructionSchema } from './balance';
import { formShortWavesAnimator, FormShortWavesInstructionSchema } from './formShortWaves';

export const AtomicInstructionSchema = z.discriminatedUnion('type', [
  AllemandeInstructionSchema,
  BalanceInstructionSchema,
  BoxTheGnatInstructionSchema,
  CaliforniaTwirlInstructionSchema,
  DropHandsInstructionSchema,
  FormShortWavesInstructionSchema,
  SwingInstructionSchema,
  TakeHandsInstructionSchema,
]);
export type AtomicInstruction = z.infer<typeof AtomicInstructionSchema>;

/** Registry mapping each atomic instruction type to its animator. */
export const atomicInstructionAnimators: {[K in AtomicInstruction['type']]: InstructionAnimator<Extract<AtomicInstruction, { type: K }>> } = {
  'allemande': allemandeAnimator,
  'balance': balanceAnimator,
  'box_the_gnat': boxTheGnatAnimator,
  'california_twirl': californiaTwirlAnimator,
  'drop_hands': dropHandsAnimator,
  'form_short_waves': formShortWavesAnimator,
  'take_hands': takeHandsAnimator,
  'swing': swingAnimator,
}

/**
 * Folds a sequence of atomic instructions into keyframes (via each animator's `final`),
 * then returns the end state and a composite Animation. The animation finds the right
 * keyframe interval for a given beat `t` and delegates to the instruction's `animate`
 * (or falls back to `lerpStates`).
 */
export function chainAtomicInstructions(init: WorldState, who: Set<ProtoId>, instrs: AtomicInstruction[]): ContraAnimation {
  if (instrs.length === 0) return () => init;
  const segments: Array<{startAt: Beats, endAt: Beats, animation: ContraAnimation}> = [];

  for (const instr of instrs) {
    const animator = atomicInstructionAnimators[instr.type] as InstructionAnimator<typeof instr>;
    const startAt = segments.length === 0 ? 0 : segments[segments.length - 1].endAt;
    const endAt = startAt + instr.beats;
    segments.push({startAt, endAt, animation: animator(init, who, instr)});
  }

  return (t) => {
    for (const segment of segments) {
      if (t < segment.startAt || t > segment.endAt) continue;
      if (t === segment.startAt) return segment.animation(t);
      if (t === segment.endAt) return segment.animation(t);
      return segment.animation(t);
    }
    throw new Error(`time ${t} is out of range for this animation`)
  };
}
