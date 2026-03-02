import { z } from 'zod';
import { type Beats } from '../contraCore';
import { AtomicInstructionSchema } from './_atomic';
import { getSplitDuration, SplitSchema } from './split';

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

export const ProgressionSchema = z.number().int();

export const DanceSchema = z.object({
  name: z.string().optional(),
  author: z.string().optional(),
  initFormation: InitFormationSchema,
  progression: ProgressionSchema,
  instructions: z.array(InstructionSchema),
});
export type Dance = z.infer<typeof DanceSchema>;
