import { z } from "zod";

import {
  type Beats,
  DOWN_PROTO_IDS,
  LARK_PROTO_IDS,
  type ProtoId,
  ROBIN_PROTO_IDS,
  UP_PROTO_IDS,
} from "../contraCore";
import { assertNever } from "../utils";
import type { WorldState } from "../worldState";
import {
  AtomicInstructionSchema,
  makeAtomicInstructionSegments,
} from "./_atomic";
import { type ContraAnimation, InstructionIdSchema } from "./_base";
import { advanceState, animateSegments, type Segment } from "./_segment";
import {
  RobinsChainInstructionSchema,
  robinsChainSegments,
} from "./robinsChain";
import { SwingInstructionSchema, swingSegments } from "./swing";

/**
 * A sub-instruction that can appear inside a split.
 * This includes all atomic instructions plus swing and robins_chain.
 */
export const SplitSubInstructionSchema = z.union([
  AtomicInstructionSchema,
  SwingInstructionSchema,
  RobinsChainInstructionSchema,
]);
export type SplitSubInstruction = z.infer<typeof SplitSubInstructionSchema>;

function chainSubInstructionSegments(
  init: WorldState,
  who: ReadonlySet<ProtoId>,
  instructions: SplitSubInstruction[],
): Segment[] {
  let state = init;
  const result: Segment[] = [];
  for (const instr of instructions) {
    let segments: Segment[];
    if (instr.type === "swing") {
      segments = swingSegments(instr, state, who);
    } else if (instr.type === "robins_chain") {
      segments = robinsChainSegments(instr, state, who);
    } else {
      segments = makeAtomicInstructionSegments(instr, state, who);
    }
    result.push(...segments);
    state = advanceState(segments, state, who);
  }
  return result;
}

export const SplitSchema = z.discriminatedUnion("by", [
  z.object({
    id: InstructionIdSchema,
    type: z.literal("split"),
    by: z.literal("role"),
    larks: z.array(SplitSubInstructionSchema),
    robins: z.array(SplitSubInstructionSchema),
  }),
  z.object({
    id: InstructionIdSchema,
    type: z.literal("split"),
    by: z.literal("direction"),
    ups: z.array(SplitSubInstructionSchema),
    downs: z.array(SplitSubInstructionSchema),
  }),
]);
export type Split = z.infer<typeof SplitSchema>;

/**
 * Animator for splits: independently chains each group's atomic instructions
 * (e.g. larks vs robins), then stitches the correct proto states together.
 * The `animate` method evaluates both sub-animations at time `t` and merges them.
 */
export const splitAnimator = (
  instr: Split,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation => {
  switch (instr.by) {
    case "role": {
      const larks = new Set(LARK_PROTO_IDS.filter((id) => who.has(id)));
      const robins = new Set(ROBIN_PROTO_IDS.filter((id) => who.has(id)));
      const larksAnim = animateSegments(
        init,
        larks,
        chainSubInstructionSegments(init, larks, instr.larks),
      );
      const robinsAnim = animateSegments(
        init,
        robins,
        chainSubInstructionSegments(init, robins, instr.robins),
      );
      return {
        dur: Math.max(larksAnim.dur, robinsAnim.dur),
        getFrame(t) {
          // Each side may have a different duration. When one side finishes
          // early, those dancers hold their final positions while the other
          // side continues, so we clamp t to each side's duration.
          const larksKf = larksAnim.getFrame(Math.min(t, larksAnim.dur));
          const robinsKf = robinsAnim.getFrame(Math.min(t, robinsAnim.dur));
          return {
            up_lark_0: larksKf["up_lark_0"],
            up_robin_0: robinsKf["up_robin_0"],
            down_lark_0: larksKf["down_lark_0"],
            down_robin_0: robinsKf["down_robin_0"],
          };
        },
      };
    }
    case "direction": {
      const ups = new Set(UP_PROTO_IDS.filter((id) => who.has(id)));
      const downs = new Set(DOWN_PROTO_IDS.filter((id) => who.has(id)));
      const upsAnim = animateSegments(
        init,
        ups,
        chainSubInstructionSegments(init, ups, instr.ups),
      );
      const downsAnim = animateSegments(
        init,
        downs,
        chainSubInstructionSegments(init, downs, instr.downs),
      );
      return {
        dur: Math.max(upsAnim.dur, downsAnim.dur),
        getFrame(t) {
          const upsKf = upsAnim.getFrame(Math.min(t, upsAnim.dur));
          const downsKf = downsAnim.getFrame(Math.min(t, downsAnim.dur));
          return {
            up_lark_0: upsKf["up_lark_0"],
            up_robin_0: upsKf["up_robin_0"],
            down_lark_0: downsKf["down_lark_0"],
            down_robin_0: downsKf["down_robin_0"],
          };
        },
      };
    }
    default:
      assertNever(instr);
  }
};

export function getSplitDuration(split: Split): Beats {
  const [a, b] =
    split.by === "role"
      ? [split.larks, split.robins]
      : [split.ups, split.downs];
  const sum = (instrs: { beats: Beats }[]) =>
    instrs.reduce((acc, i) => acc + i.beats, 0);
  return Math.max(sum(a), sum(b));
}
