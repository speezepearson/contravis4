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
import { animateAtomicInstruction, AtomicInstructionSchema } from "./_atomic";
import {
  type Animator,
  chainAnimators,
  type ContraAnimation,
  InstructionIdSchema,
} from "./_base";
import {
  robinsChainAnimator,
  RobinsChainInstructionSchema,
} from "./robinsChain";
import { swingAnimator, SwingInstructionSchema } from "./swing";

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

function subInstructionAnimator(instr: SplitSubInstruction): Animator {
  return (init, who) => {
    if (instr.type === "swing") return swingAnimator(instr, init, who);
    if (instr.type === "robins_chain")
      return robinsChainAnimator(instr, init, who);
    return animateAtomicInstruction(instr, init, who);
  };
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
function mergeGroupAnimations(
  groupA: ContraAnimation,
  groupB: ContraAnimation,
  bIds: ReadonlySet<ProtoId>,
): ContraAnimation {
  return {
    dur: Math.max(groupA.dur, groupB.dur),
    getFrame(t) {
      // Each side may have a different duration. When one side finishes
      // early, those dancers hold their final positions while the other
      // side continues, so we clamp t to each side's duration.
      const aFrame = groupA.getFrame(Math.min(t, groupA.dur));
      const bFrame = groupB.getFrame(Math.min(t, groupB.dur));
      const result = { ...aFrame };
      for (const id of bIds) result[id] = bFrame[id];
      return result;
    },
  };
}

export const splitAnimator = (
  instr: Split,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation => {
  switch (instr.by) {
    case "role": {
      const larks = new Set(LARK_PROTO_IDS.filter((id) => who.has(id)));
      const robins = new Set(ROBIN_PROTO_IDS.filter((id) => who.has(id)));
      const larksAnim = chainAnimators(instr.larks.map(subInstructionAnimator))(
        init,
        larks,
      );
      const robinsAnim = chainAnimators(
        instr.robins.map(subInstructionAnimator),
      )(init, robins);
      return mergeGroupAnimations(larksAnim, robinsAnim, robins);
    }
    case "direction": {
      const ups = new Set(UP_PROTO_IDS.filter((id) => who.has(id)));
      const downs = new Set(DOWN_PROTO_IDS.filter((id) => who.has(id)));
      const upsAnim = chainAnimators(instr.ups.map(subInstructionAnimator))(
        init,
        ups,
      );
      const downsAnim = chainAnimators(instr.downs.map(subInstructionAnimator))(
        init,
        downs,
      );
      return mergeGroupAnimations(upsAnim, downsAnim, downs);
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
