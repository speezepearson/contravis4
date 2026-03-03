import { ALL_PROTO_IDS, type ProtoId } from "./contraCore";
import {
  type AtomicInstruction,
  makeAtomicInstructionAnimator,
} from "./instructions/_atomic";
import {
  chainAnimations,
  type ContraAnimation,
  type InstructionId,
} from "./instructions/_base";
import {
  type InitFormation,
  initFormationStates,
  type Instruction,
  instructionDuration,
} from "./instructions/index";
import { type Split, splitAnimator } from "./instructions/split";
import { assertNever } from "./utils";
import type { WorldState } from "./worldState";

export class GenerateError extends Error {
  public instructionId: InstructionId;
  public message: string;
  constructor(instructionId: InstructionId, message: string, cause?: Error) {
    super(message);
    this.instructionId = instructionId;
    this.message = message;
    this.cause = cause;
  }
}

export interface GenerateResult {
  animation: ContraAnimation | null;
  errors: GenerateError[];
}

/** Animate a single instruction (atomic or split) from `init`. */
function animateInstruction(
  init: WorldState,
  instr: Instruction,
): ContraAnimation {
  if (instr.type === "split") {
    return splitAnimator(instr)(init, new Set<ProtoId>(ALL_PROTO_IDS));
  }
  return makeAtomicInstructionAnimator(instr)(
    init,
    new Set<ProtoId>(ALL_PROTO_IDS),
  );
}

/**
 * Chains all instructions into a single ContraAnimation.
 * On error, returns the partial animation up to the failing instruction + error info.
 */
export function generateDanceAnimation(
  instructions: Instruction[],
  initFormation: InitFormation,
): GenerateResult {
  const initState = initFormationStates[initFormation];
  const segments: ContraAnimation[] = [];
  const errors: GenerateError[] = [];

  let currentState = initState;

  for (const instr of instructions) {
    try {
      const anim = animateInstruction(currentState, instr);
      segments.push(anim);
      currentState = anim.getFrame(anim.dur);
    } catch (e) {
      errors.push(
        new GenerateError(
          instr.id,
          e instanceof Error ? e.message : String(e),
          e instanceof Error ? e : undefined,
        ),
      );
      // Hold at currentState for the failed instruction's duration
      const dur = instructionDuration(instr);
      const holdState = currentState;
      segments.push({ dur, getFrame: () => holdState });
    }
  }

  return {
    animation: segments.length > 0 ? chainAnimations(segments) : null,
    errors,
  };
}

/**
 * Walk the instruction list and sum beats until we find `targetId`.
 * Returns the beat number at which the instruction starts, or null if not found.
 */
export function findInstructionStartBeat(
  instructions: Instruction[],
  targetId: InstructionId,
): number | null {
  let beat = 0;
  for (const instr of instructions) {
    if (instr.id === targetId) return beat;
    if (instr.type === "split") {
      const [listA, listB] = splitLists(instr);
      let b = beat;
      for (const sub of listA) {
        if (sub.id === targetId) return b;
        b += sub.beats;
      }
      b = beat;
      for (const sub of listB) {
        if (sub.id === targetId) return b;
        b += sub.beats;
      }
    }
    beat += instructionDuration(instr);
  }
  return null;
}

/** Get the two sub-lists of a split instruction. */
export function splitLists(
  split: Split,
): [AtomicInstruction[], AtomicInstruction[]] {
  switch (split.by) {
    case "role":
      return [split.larks, split.robins];
    case "direction":
      return [split.ups, split.downs];
    default:
      assertNever(split);
  }
}

/** Reconstruct a split instruction's sub-list fields from (by, listA, listB). */
export function splitWithLists(
  by: Split["by"],
  listA: AtomicInstruction[],
  listB: AtomicInstruction[],
):
  | { by: "role"; larks: AtomicInstruction[]; robins: AtomicInstruction[] }
  | { by: "direction"; ups: AtomicInstruction[]; downs: AtomicInstruction[] } {
  switch (by) {
    case "role":
      return { by: "role", larks: listA, robins: listB };
    case "direction":
      return { by: "direction", ups: listA, downs: listB };
    default:
      assertNever(by);
  }
}

/** Format a Zod parse error for dance JSON, producing a human-readable message. */
export function formatDanceParseError(
  error: import("zod").ZodError,
  _raw: unknown,
): string {
  return error.issues
    .map(
      (issue) =>
        `${issue.path.length > 0 ? issue.path.join(".") + ": " : ""}${issue.message}`,
    )
    .join("\n");
}
