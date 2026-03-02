import { z } from 'zod';
import { type Beats } from '../contraCore';
import { AtomicInstructionSchema } from './_atomic';
import { getSplitDuration, SplitSchema } from './split';
import type { WorldState } from '../worldState';
import { Vector } from 'vecti';
import { EAST, NORTH, SOUTH, WEST } from '../geometry';

export { InstructionIdSchema, type InstructionId, type RelativeDirection, RelativeDirectionSchema } from './_base';

export const ActionTypeSchema = z.enum(['take_hands', 'drop_hands', 'allemande', 'do_si_do', 'circle', 'pull_by', 'pass_by', 'step', 'balance', 'swing', 'box_the_gnat', 'give_and_take_into_swing', 'mad_robin', 'turn_alone', 'california_twirl', 'turn_as_a_couple', 'right_left_through', 'square_through', 'courtesy_turn', 'shoulder_round', 'short_waves', 'long_waves', 'long_lines']);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const InstructionSchema = z.discriminatedUnion('type',[
  AtomicInstructionSchema,
  SplitSchema,
]);
export type Instruction = z.infer<typeof InstructionSchema>;

export function instructionDuration(instr: Instruction): Beats {
  switch (instr.type) {
    case 'split': return getSplitDuration(instr);
    default: return instr.beats;
  }
}

export function danceLength(instructions: Instruction[]): Beats {
  return Math.max(4, instructions.reduce((s, i) => s + instructionDuration(i), 0));
}


export const InitFormationSchema = z.enum(['improper', 'beckett']);
export type InitFormation = z.infer<typeof InitFormationSchema>;

export const initFormationStates: Record<InitFormation, WorldState> = {
  improper: {
    beat: 0,
    protos: {
      up_lark_0: { protoId: 'up_lark_0', pos: new Vector(-0.5, -0.5), facing: NORTH, hands: {} },
      up_robin_0: { protoId: 'up_robin_0', pos: new Vector(0.5, -0.5), facing: NORTH, hands: {} },
      down_lark_0: { protoId: 'down_lark_0', pos: new Vector(0.5, 0.5), facing: SOUTH, hands: {} },
      down_robin_0: { protoId: 'down_robin_0', pos: new Vector(-0.5, 0.5), facing: SOUTH, hands: {} },
    },
  },
  beckett: {
    beat: 0,
    protos: {
      up_lark_0: { protoId: 'up_lark_0', pos: new Vector(-0.5, 0.5), facing: EAST, hands: {} },
      up_robin_0: { protoId: 'up_robin_0', pos: new Vector(-0.5, -0.5), facing: EAST, hands: {} },
      down_lark_0: { protoId: 'down_lark_0', pos: new Vector(0.5, -0.5), facing: WEST, hands: {} },
      down_robin_0: { protoId: 'down_robin_0', pos: new Vector(0.5, 0.5), facing: WEST, hands: {} },
    },
  },
};

export const ProgressionSchema = z.number().int();

export const DanceSchema = z.object({
  name: z.string().optional(),
  author: z.string().optional(),
  initFormation: InitFormationSchema,
  progression: ProgressionSchema,
  instructions: z.array(InstructionSchema),
});
export type Dance = z.infer<typeof DanceSchema>;
