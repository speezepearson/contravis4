import { z } from 'zod';
import { InstructionIdSchema, type Animation, type InstructionAnimator } from './_base';
import { type Beats, LARK_PROTO_IDS, ROBIN_PROTO_IDS, UP_PROTO_IDS, DOWN_PROTO_IDS, type ProtoId } from '../contraCore';
import { assertNever } from '../utils';
import type { WorldState } from '../worldState';
import { AtomicInstructionSchema, chainAtomicInstructions } from './_atomic';

export const SplitSchema = z.discriminatedUnion('by', [
  z.object({ id: InstructionIdSchema, type: z.literal('split'), by: z.literal('role'), larks: z.array(AtomicInstructionSchema), robins: z.array(AtomicInstructionSchema) }),
  z.object({ id: InstructionIdSchema, type: z.literal('split'), by: z.literal('direction'), ups: z.array(AtomicInstructionSchema), downs: z.array(AtomicInstructionSchema) }),
]);
export type Split = z.infer<typeof SplitSchema>;

/**
 * Animator for splits: independently chains each group's atomic instructions
 * (e.g. larks vs robins), then stitches the correct proto states together.
 * The `animate` method evaluates both sub-animations at time `t` and merges them.
 */
export const splitAnimator: InstructionAnimator<Split> = {
  final(state: WorldState, who: Set<ProtoId>, instr: Split): WorldState {
    switch (instr.by) {
      case 'role':  {
        const larks = chainAtomicInstructions(state, new Set(LARK_PROTO_IDS.filter((id) => who.has(id))), instr.larks);
        const robins = chainAtomicInstructions(state, new Set(ROBIN_PROTO_IDS.filter((id) => who.has(id))), instr.robins);
        return {
          ...state,
          beat: state.beat + getSplitDuration(instr),
          protos: {
            up_lark_0: larks.final.protos['up_lark_0'],
            up_robin_0: robins.final.protos['up_robin_0'],
            down_lark_0: larks.final.protos['down_lark_0'],
            down_robin_0: robins.final.protos['down_robin_0'],
          },
        };
      }
      case 'direction': {
        const ups = chainAtomicInstructions(state, new Set(UP_PROTO_IDS.filter((id) => who.has(id))), instr.ups);
        const downs = chainAtomicInstructions(state, new Set(DOWN_PROTO_IDS.filter((id) => who.has(id))), instr.downs);
        return {
          ...state,
          beat: state.beat + getSplitDuration(instr),
          protos: {
            up_lark_0: ups.final.protos['up_lark_0'],
            up_robin_0: ups.final.protos['up_robin_0'],
            down_lark_0: downs.final.protos['down_lark_0'],
            down_robin_0: downs.final.protos['down_robin_0'],
          },
        };
      }
      default: assertNever(instr);
    }
  },

  animate(init: WorldState, who: Set<ProtoId>, instr: Split): Animation {
    switch (instr.by) {
      case 'role':  {
        const larks = chainAtomicInstructions(init, new Set(LARK_PROTO_IDS.filter((id) => who.has(id))), instr.larks);
        const robins = chainAtomicInstructions(init, new Set(ROBIN_PROTO_IDS.filter((id) => who.has(id))), instr.robins);
        return (t) => {
          const larksKf = larks.animation(t);
          const robinsKf = robins.animation(t);
          return {
            beat: t,
            protos: {
              up_lark_0: larksKf.protos['up_lark_0'],
              up_robin_0: robinsKf.protos['up_robin_0'],
              down_lark_0: larksKf.protos['down_lark_0'],
              down_robin_0: robinsKf.protos['down_robin_0'],
            },
          };
        };
      }
      case 'direction': {
        const ups = chainAtomicInstructions(init, new Set(UP_PROTO_IDS.filter((id) => who.has(id))), instr.ups);
        const downs = chainAtomicInstructions(init, new Set(DOWN_PROTO_IDS.filter((id) => who.has(id))), instr.downs);
        return (t) => {
          const upsKf = ups.animation(t);
          const downsKf = downs.animation(t);
          return {
            beat: t,
            protos: {
              up_lark_0: upsKf.protos['up_lark_0'],
              up_robin_0: upsKf.protos['up_robin_0'],
              down_lark_0: downsKf.protos['down_lark_0'],
              down_robin_0: downsKf.protos['down_robin_0'],
            },
          };
        };
      }
      default: assertNever(instr);
    }
  },
}

export function getSplitDuration(split: Split): Beats {
  const instrs = split.by === 'role' ? [...split.larks, ...split.robins] : [...split.ups, ...split.downs];
  return Math.max(...instrs.map((i) => i.beats));
}
