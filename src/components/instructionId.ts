/**
 * InstructionId is a purely UI concern — it's not part of the conceptual model
 * of a Dance or Instruction. The UI assigns ids to instructions so it can
 * track them across renders, support drag-and-drop, selection, etc.
 */
import { z } from "zod";

import type { Instruction } from "../instructions/index";
import type { Split, SplitSubInstruction } from "../instructions/split";

export const InstructionIdSchema = z.string().uuid();
export type InstructionId = z.infer<typeof InstructionIdSchema>;

export function makeInstructionId(): InstructionId {
  return InstructionIdSchema.parse(crypto.randomUUID());
}

export type SplitSubInstructionWithId = SplitSubInstruction & {
  id: InstructionId;
};

export type SplitWithId =
  | (Extract<Split, { by: "role" }> & {
      id: InstructionId;
      larks: SplitSubInstructionWithId[];
      robins: SplitSubInstructionWithId[];
    })
  | (Extract<Split, { by: "direction" }> & {
      id: InstructionId;
      ups: SplitSubInstructionWithId[];
      downs: SplitSubInstructionWithId[];
    });

export type InstructionWithId =
  | (Exclude<Instruction, Split> & { id: InstructionId })
  | SplitWithId;

function assignSubId(sub: SplitSubInstruction): SplitSubInstructionWithId {
  return { ...sub, id: makeInstructionId() };
}

export function assignId(instr: Instruction): InstructionWithId {
  if (instr.type === "split") {
    if (instr.by === "role") {
      return {
        ...instr,
        id: makeInstructionId(),
        larks: instr.larks.map(assignSubId),
        robins: instr.robins.map(assignSubId),
      };
    } else {
      return {
        ...instr,
        id: makeInstructionId(),
        ups: instr.ups.map(assignSubId),
        downs: instr.downs.map(assignSubId),
      };
    }
  }
  return { ...instr, id: makeInstructionId() };
}

export function assignIds(instrs: Instruction[]): InstructionWithId[] {
  return instrs.map(assignId);
}

/**
 * Like splitLists from generate.ts, but preserves the WithId types.
 */
export function splitListsWithId(
  split: SplitWithId,
): [SplitSubInstructionWithId[], SplitSubInstructionWithId[]] {
  switch (split.by) {
    case "role":
      return [split.larks, split.robins];
    case "direction":
      return [split.ups, split.downs];
  }
}
