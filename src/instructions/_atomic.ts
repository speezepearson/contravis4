import { z } from 'zod';
import { allemandeAnimator, AllemandeInstructionSchema } from './allemande';
import { boxTheGnatAnimator, BoxTheGnatInstructionSchema } from './boxTheGnat';
import { californiaTwirlAnimator, CaliforniaTwirlInstructionSchema } from './californiaTwirl';
import { dropHandsAnimator, DropHandsInstructionSchema } from './dropHands';
import { swingAnimator, SwingInstructionSchema } from './swing';
import { takeHandsAnimator, TakeHandsInstructionSchema } from './takeHands';
import { type InstructionAnimator, type Animation, lerpStates } from './_base';
import type { ProtoId } from '../contraCore';
import type { WorldState } from '../worldState';

export const AtomicInstructionSchema = z.discriminatedUnion('type', [
  AllemandeInstructionSchema,
  BoxTheGnatInstructionSchema,
  CaliforniaTwirlInstructionSchema,
  DropHandsInstructionSchema,
  SwingInstructionSchema,
  TakeHandsInstructionSchema,
]);
export type AtomicInstruction = z.infer<typeof AtomicInstructionSchema>;

/** Registry mapping each atomic instruction type to its animator. */
export const atomicInstructionAnimators: {[K in AtomicInstruction['type']]: InstructionAnimator<Extract<AtomicInstruction, { type: K }>> } = {
  'allemande': allemandeAnimator,
  'box_the_gnat': boxTheGnatAnimator,
  'california_twirl': californiaTwirlAnimator,
  'drop_hands': dropHandsAnimator,
  'take_hands': takeHandsAnimator,
  'swing': swingAnimator,
}

/**
 * Folds a sequence of atomic instructions into keyframes (via each animator's `final`),
 * then returns the end state and a composite Animation. The animation finds the right
 * keyframe interval for a given beat `t` and delegates to the instruction's `animate`
 * (or falls back to `lerpStates`).
 */
export function chainAtomicInstructions(init: WorldState, who: Set<ProtoId>, instrs: AtomicInstruction[]): {final: WorldState, animation: Animation} {
  const keyframes: Array<WorldState> = [init];

  for (const instr of instrs) {
    const animator = atomicInstructionAnimators[instr.type] as InstructionAnimator<typeof instr>;
    keyframes.push(animator.final(keyframes[keyframes.length - 1], who, instr));
  }

  return {
    final: keyframes[keyframes.length - 1],
    animation(t) {
      for (let i=0; i<instrs.length; i++) {
        const initKf = keyframes[i];
        const finalKf = keyframes[i+1];
        if (t < initKf.beat || t > finalKf.beat) continue;
        if (t === initKf.beat) return initKf;
        if (t === finalKf.beat) return finalKf;

        const instr = instrs[i];
        const animator = atomicInstructionAnimators[instr.type] as InstructionAnimator<typeof instr>;
        const elapsed = t - initKf.beat;

        if (animator.animate) {
          return animator.animate(initKf, who, instr)(elapsed);
        } else {
          return lerpStates(initKf, finalKf, elapsed);
        }
      }
      throw new Error(`time ${t} is out of range for this animation`)
    }
  };
}
