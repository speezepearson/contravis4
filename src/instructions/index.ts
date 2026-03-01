import { z } from 'zod';
import { InstructionIdSchema } from './_base';
import { takeHands, TakeHandsInstructionSchema } from './takeHands';
import { dropHands, DropHandsInstructionSchema } from './dropHands';
import { allemande, AllemandeInstructionSchema } from './allemande';
import { DoSiDoInstructionSchema } from './doSiDo';
import { CircleInstructionSchema } from './circle';
import { PullByInstructionSchema } from './pullBy';
import { PassByInstructionSchema } from './passBy';
import { StepInstructionSchema } from './step';
import { BalanceInstructionSchema } from './balance';
import { SwingInstructionSchema } from './swing';
import { boxTheGnat, BoxTheGnatInstructionSchema } from './boxTheGnat';
import { GiveAndTakeIntoSwingInstructionSchema } from './giveAndTakeIntoSwing';
import { MadRobinInstructionSchema } from './madRobin';
import { TurnAloneInstructionSchema } from './turnAlone';
import { californiaTwirl, CaliforniaTwirlInstructionSchema } from './californiaTwirl';
import { TurnAsACoupleInstructionSchema } from './turnAsACouple';
import { RightLeftThroughInstructionSchema } from './rightLeftThrough';
import { CourtesyTurnInstructionSchema } from './courtesyTurn';
import { ShoulderRoundInstructionSchema } from './shoulderRound';
import { SquareThroughInstructionSchema } from './squareThrough';
import { ShortWavesInstructionSchema } from './shortWaves';
import { LongWavesInstructionSchema } from './longWaves';
import { LongLinesInstructionSchema } from './longLines';
import type { WorldState } from '../worldState';
import { DOWN_PROTO_IDS, LARK_PROTO_IDS, ROBIN_PROTO_IDS, UP_PROTO_IDS, type ProtoId } from '../contraCore';
import { assertNever } from '../utils';

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

export const SplitSchema = z.discriminatedUnion('by', [
  z.object({ id: InstructionIdSchema, type: z.literal('split'), by: z.literal('role'), larks: z.array(AtomicInstructionSchema), robins: z.array(AtomicInstructionSchema) }),
  z.object({ id: InstructionIdSchema, type: z.literal('split'), by: z.literal('direction'), ups: z.array(AtomicInstructionSchema), downs: z.array(AtomicInstructionSchema) }),
]);
export type Split = z.infer<typeof SplitSchema>;

export function getSplitDuration(split: Split): number {
  const instrs = split.by === 'role' ? [...split.larks, ...split.robins] : [...split.ups, ...split.downs];
  return Math.max(...instrs.map((i) => i.beats));
}
export function executeSplit(split: Split, state: WorldState): WorldState {
  switch (split.by) {
    case 'role':  {
      const larkFinal = executeInstructions(state, new Set(LARK_PROTO_IDS), split.larks);
      const robinFinal = executeInstructions(state, new Set(ROBIN_PROTO_IDS), split.robins);
      return {
        ...state,
        protos: {
          up_lark_0: larkFinal.protos['up_lark_0'],
          up_robin_0: robinFinal.protos['up_robin_0'],
          down_lark_0: larkFinal.protos['down_lark_0'],
          down_robin_0: robinFinal.protos['down_robin_0'],
        },
      };
    }
    case 'direction': {
      const upFinal = executeInstructions(state, new Set(UP_PROTO_IDS), split.ups);
      const downFinal = executeInstructions(state, new Set(DOWN_PROTO_IDS), split.downs);
      return {
        ...state,
        protos: {
          up_lark_0: upFinal.protos['up_lark_0'],
          up_robin_0: upFinal.protos['up_robin_0'],
          down_lark_0: downFinal.protos['down_lark_0'],
          down_robin_0: downFinal.protos['down_robin_0'],
        },
      };
    }
    default: assertNever(split);
  }
}

export type Instruction = (
  | AtomicInstruction
  | Split
);

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
  switch (instr.type) {
    case 'split': return getSplitDuration(instr);
    default: return instr.beats;
  }
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

export function executeInstruction(state: WorldState, who: Set<ProtoId>, instr: Instruction): WorldState {
  const unticked = ((): Omit<WorldState, 'beat'> => {switch (instr.type) {
    case 'allemande': return allemande(state, who, instr);
    case 'box_the_gnat': return boxTheGnat(state, who, instr);
    case 'california_twirl': return californiaTwirl(state, who);
    case 'drop_hands': return dropHands(state, who, instr);
    case 'take_hands': return takeHands(state, who, instr);
    case 'split': return executeSplit(instr, state);
    case 'balance': case 'circle': case 'do_si_do': case 'pull_by': case 'pass_by': case 'step': case 'swing': case 'give_and_take_into_swing': case 'mad_robin': case 'turn_alone': case 'turn_as_a_couple': case 'right_left_through': case 'square_through': case 'courtesy_turn': case 'shoulder_round': case 'short_waves': case 'long_waves': case 'long_lines':
      throw new Error(`not implemented`);
    default: assertNever(instr);
  }})();

  return {
    ...unticked,
    beat: state.beat + instructionDuration(instr),
  }
}

export function executeInstructions(state: WorldState, who: Set<ProtoId>, instructions: Instruction[]): Omit<WorldState, 'beat'> {
  return instructions.reduce((s, i) => executeInstruction(s, who, i), state);
}
