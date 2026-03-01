import { z } from 'zod';
import { InstructionIdSchema, type InstructionId } from './_base';
import { TakeHandsInstructionSchema } from './takeHands';
import { DropHandsInstructionSchema } from './dropHands';
import { AllemandeInstructionSchema } from './allemande';
import { DoSiDoInstructionSchema } from './doSiDo';
import { CircleInstructionSchema } from './circle';
import { PullByInstructionSchema } from './pullBy';
import { PassByInstructionSchema } from './passBy';
import { StepInstructionSchema } from './step';
import { BalanceInstructionSchema } from './balance';
import { SwingInstructionSchema } from './swing';
import { BoxTheGnatInstructionSchema } from './boxTheGnat';
import { GiveAndTakeIntoSwingInstructionSchema } from './giveAndTakeIntoSwing';
import { MadRobinInstructionSchema } from './madRobin';
import { TurnAloneInstructionSchema } from './turnAlone';
import { CaliforniaTwirlInstructionSchema } from './californiaTwirl';
import { TurnAsACoupleInstructionSchema } from './turnAsACouple';
import { RightLeftThroughInstructionSchema } from './rightLeftThrough';
import { CourtesyTurnInstructionSchema } from './courtesyTurn';
import { ShoulderRoundInstructionSchema } from './shoulderRound';
import { SquareThroughInstructionSchema } from './squareThrough';
import { ShortWavesInstructionSchema } from './shortWaves';
import { LongWavesInstructionSchema } from './longWaves';
import { LongLinesInstructionSchema } from './longLines';

export { InstructionIdSchema, type InstructionId, type RelativeDirection, RelativeDirectionSchema } from './_base';

export const DirectionalRelationshipSchema = z.enum(['on_left', 'on_right', 'in_front', 'larks_left_robins_right', 'larks_right_robins_left']);
export type DirectionalRelationship = z.infer<typeof DirectionalRelationshipSchema>;

export const AtomicInstructionSchema = z.discriminatedUnion('type', [
  TakeHandsInstructionSchema,
  DropHandsInstructionSchema,
  AllemandeInstructionSchema,
  DoSiDoInstructionSchema,
  CircleInstructionSchema,
  PullByInstructionSchema,
  PassByInstructionSchema,
  StepInstructionSchema,
  BalanceInstructionSchema,
  SwingInstructionSchema,
  BoxTheGnatInstructionSchema,
  GiveAndTakeIntoSwingInstructionSchema,
  MadRobinInstructionSchema,
  TurnAloneInstructionSchema,
  CaliforniaTwirlInstructionSchema,
  TurnAsACoupleInstructionSchema,
  RightLeftThroughInstructionSchema,
  CourtesyTurnInstructionSchema,
  ShoulderRoundInstructionSchema,
  SquareThroughInstructionSchema,
  ShortWavesInstructionSchema,
  LongWavesInstructionSchema,
  LongLinesInstructionSchema,
]);
export type AtomicInstruction = z.infer<typeof AtomicInstructionSchema>;

export const ActionTypeSchema = z.enum(['take_hands', 'drop_hands', 'allemande', 'do_si_do', 'circle', 'pull_by', 'pass_by', 'step', 'balance', 'swing', 'box_the_gnat', 'give_and_take_into_swing', 'mad_robin', 'turn_alone', 'california_twirl', 'turn_as_a_couple', 'right_left_through', 'square_through', 'courtesy_turn', 'shoulder_round', 'short_waves', 'long_waves', 'long_lines']);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const SplitBySchema = z.discriminatedUnion('by', [
  z.object({ by: z.literal('role'), larks: z.array(AtomicInstructionSchema), robins: z.array(AtomicInstructionSchema) }),
  z.object({ by: z.literal('position'), ups: z.array(AtomicInstructionSchema), downs: z.array(AtomicInstructionSchema) }),
]);
export type SplitBy = z.infer<typeof SplitBySchema>;

/** Get the two sub-instruction lists from a split, in [groupA, groupB] order.
 *  role → [larks, robins], position → [ups, downs]. */
export function splitLists(split: SplitBy): [AtomicInstruction[], AtomicInstruction[]] {
  if (split.by === 'role') return [split.larks, split.robins];
  return [split.ups, split.downs];
}

/** Build a SplitBy with updated sub-instruction lists, preserving the discriminator. */
export function splitWithLists(by: SplitBy['by'], listA: AtomicInstruction[], listB: AtomicInstruction[]): SplitBy {
  if (by === 'role') return { by: 'role', larks: listA, robins: listB };
  return { by: 'position', ups: listA, downs: listB };
}

// We define the type manually with the brand baked in and annotate the schema accordingly.
export type Instruction = (
  | AtomicInstruction
  | { id: InstructionId; type: 'split' } & SplitBy
) & z.BRAND<'Instruction'>;

// The `as unknown as` double-cast bridges the gap between the unbranded
// schema output and our branded Instruction type.  At runtime z.lazy
// validates the full recursive structure; the cast only affects the
// compile-time type so that parse() returns branded Instructions.
export const InstructionSchema: z.ZodType<Instruction> = z.union([
  AtomicInstructionSchema,
  z.object({ id: InstructionIdSchema, type: z.literal('split'), by: z.literal('role'), larks: z.array(AtomicInstructionSchema), robins: z.array(AtomicInstructionSchema) }),
  z.object({ id: InstructionIdSchema, type: z.literal('split'), by: z.literal('position'), ups: z.array(AtomicInstructionSchema), downs: z.array(AtomicInstructionSchema) }),
]) as unknown as z.ZodType<Instruction>;

export function instructionDuration(instr: Instruction): number {
  if (instr.type === 'split') {
    const [listA, listB] = splitLists(instr);
    return Math.max(listA.reduce((s, i) => s + i.beats, 0),
                    listB.reduce((s, i) => s + i.beats, 0));
  }
  return instr.beats;
}

export function danceLength(instructions: Instruction[]): number {
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
