import { ALL_PROTO_IDS_SET } from "./contraCore";
import { makeAtomicInstructionSegments } from "./instructions/_atomic";
import {
  chainAnimations,
  type ContraAnimation,
  type InstructionId,
} from "./instructions/_base";
import { animateSegments } from "./instructions/_segment";
import { type Instruction, instructionDuration } from "./instructions/index";
import { robinsChainAnimator } from "./instructions/robinsChain";
import {
  type Split,
  splitAnimator,
  type SplitSubInstruction,
} from "./instructions/split";
import { swingAnimator } from "./instructions/swing";
import { SnazzyError, type SnazzySegment } from "./snazzyError";
import { assertNever } from "./utils";
import type { WorldState } from "./worldState";

export class GenerateError extends Error {
  public instructionId: InstructionId;
  public message: string;
  public initState: WorldState;
  public segments: SnazzySegment[];
  constructor(
    instructionId: InstructionId,
    message: string,
    initState: WorldState,
    cause?: Error,
    segments?: SnazzySegment[],
  ) {
    super(message);
    this.instructionId = instructionId;
    this.message = message;
    this.initState = initState;
    this.cause = cause;
    this.segments = segments ?? [message];
  }
}

export interface GenerateResult {
  animation: ContraAnimation | null;
  errors: GenerateError[];
}

/** Animate a single instruction (atomic, split, or plan-based) from `init`. */
function animateInstruction(
  init: WorldState,
  instr: Instruction,
): ContraAnimation {
  switch (instr.type) {
    case "split":
      return splitAnimator(instr, init, ALL_PROTO_IDS_SET);
    case "swing":
      return swingAnimator(instr, init, ALL_PROTO_IDS_SET);
    case "robins_chain":
      return robinsChainAnimator(instr, init, ALL_PROTO_IDS_SET);
    default:
      return animateSegments(
        init,
        ALL_PROTO_IDS_SET,
        makeAtomicInstructionSegments(instr, init, ALL_PROTO_IDS_SET),
      );
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
