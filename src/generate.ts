import { ALL_PROTO_IDS_SET } from "./contraCore";
import { animateAtomicInstruction } from "./instructions/_atomic";
import {
  type AnimationWarning,
  chainAnimations,
  type ContraAnimation,
} from "./instructions/_base";
import { type Instruction, instructionDuration } from "./instructions/index";
import {
  type Split,
  splitAnimator,
  type SplitSubInstruction,
} from "./instructions/split";
import { SnazzyError, type SnazzySegment } from "./snazzyError";
import { assertNever } from "./utils";
import type { WorldState } from "./worldState";

export class GenerateError extends Error {
  public instruction: Instruction;
  public message: string;
  public initState: WorldState;
  public segments: SnazzySegment[];
  constructor(
    instruction: Instruction,
    message: string,
    initState: WorldState,
    cause?: Error,
    segments?: SnazzySegment[],
  ) {
    super(message);
    this.instruction = instruction;
    this.message = message;
    this.initState = initState;
    this.cause = cause;
    this.segments = segments ?? [message];
  }
}

export interface GenerateResult {
  animation: ContraAnimation | null;
  errors: GenerateError[];
  /** Per-instruction animation warnings (keyed by instruction reference). */
  warnings: Map<Instruction, AnimationWarning[]>;
}

/** Animate a single instruction (atomic, split, or plan-based) from `init`. */
function animateInstruction(
  init: WorldState,
  instr: Instruction,
): ContraAnimation {
  switch (instr.type) {
    case "split":
      return splitAnimator(instr, init, ALL_PROTO_IDS_SET);
    default:
      return animateAtomicInstruction(instr, init, ALL_PROTO_IDS_SET);
  }
}

/**
 * Chains all instructions into a single ContraAnimation.
 * On error, returns the partial animation up to the failing instruction + error info.
 */
export function generateDanceAnimation(
  instructions: Instruction[],
  initState: WorldState,
): GenerateResult {
  const segments: ContraAnimation[] = [];
  const errors: GenerateError[] = [];
  const warnings = new Map<Instruction, AnimationWarning[]>();

  let currentState = initState;

  for (const instr of instructions) {
    try {
      const anim = animateInstruction(currentState, instr);
      segments.push(anim);
      if (anim.warnings && anim.warnings.length > 0) {
        if (instr.type === "split") {
          // Attribute warnings to sub-instructions by beat
          attributeSplitWarnings(instr, anim.warnings, warnings);
        } else {
          warnings.set(instr, anim.warnings);
        }
      }
      currentState = anim.getFrame(anim.dur);
    } catch (e) {
      errors.push(
        new GenerateError(
          instr,
          e instanceof Error ? e.message : String(e),
          currentState,
          e instanceof Error ? e : undefined,
          e instanceof SnazzyError ? e.segments : undefined,
        ),
      );
      // Hold at currentState for the failed instruction's duration
      const dur = instructionDuration(instr);
      const holdState = currentState;
      segments.push({ dur, getFrame: () => holdState });
    }
  }

  return {
    animation:
      segments.length > 0
        ? chainAnimations(segments)
        : { dur: 0, getFrame: () => initState },
    errors,
    warnings,
  };
}

/** Attribute warnings from a split animation to the appropriate sub-instruction by beat. */
function attributeSplitWarnings(
  split: Split,
  animWarnings: AnimationWarning[],
  out: Map<Instruction, AnimationWarning[]>,
): void {
  const [listA, listB] = splitLists(split);
  for (const list of [listA, listB]) {
    // Build cumulative beat ranges for sub-instructions
    const spans: Array<{
      instr: SplitSubInstruction;
      start: number;
      end: number;
    }> = [];
    let beat = 0;
    for (const sub of list) {
      spans.push({ instr: sub, start: beat, end: beat + sub.beats });
      beat += sub.beats;
    }
    for (const w of animWarnings) {
      for (const span of spans) {
        if (w.beat >= span.start && w.beat < span.end) {
          const existing = out.get(span.instr);
          const adjusted: AnimationWarning = {
            beat: w.beat - span.start,
            warning: w.warning,
          };
          if (existing) {
            existing.push(adjusted);
          } else {
            out.set(span.instr, [adjusted]);
          }
          break;
        }
      }
    }
  }
}

/**
 * Walk the instruction list and sum beats until we find `target` (by reference equality).
 * Returns the beat number at which the instruction starts, or null if not found.
 */
export function findInstructionStartBeat(
  instructions: Instruction[],
  target: Instruction,
): number | null {
  let beat = 0;
  for (const instr of instructions) {
    if (instr === target) return beat;
    if (instr.type === "split") {
      const [listA, listB] = splitLists(instr);
      let b = beat;
      for (const sub of listA) {
        if (sub === target) return b;
        b += sub.beats;
      }
      b = beat;
      for (const sub of listB) {
        if (sub === target) return b;
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
): [SplitSubInstruction[], SplitSubInstruction[]] {
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
  listA: SplitSubInstruction[],
  listB: SplitSubInstruction[],
):
  | {
      by: "role";
      larks: SplitSubInstruction[];
      robins: SplitSubInstruction[];
    }
  | {
      by: "direction";
      ups: SplitSubInstruction[];
      downs: SplitSubInstruction[];
    } {
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
