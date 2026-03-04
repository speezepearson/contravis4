import { z } from "zod";

import {
  type Beats,
  DOWN_PROTO_IDS,
  LARK_PROTO_IDS,
  ROBIN_PROTO_IDS,
  UP_PROTO_IDS,
} from "../contraCore";
import { assertNever } from "../utils";
import {
  AtomicInstructionSchema,
  makeAtomicInstructionAnimator,
} from "./_atomic";
import { type Animator, chainAnimators, InstructionIdSchema } from "./_base";

export const SplitSchema = z.discriminatedUnion("by", [
  z.object({
    id: InstructionIdSchema,
    type: z.literal("split"),
    by: z.literal("role"),
    larks: z.array(AtomicInstructionSchema),
    robins: z.array(AtomicInstructionSchema),
  }),
  z.object({
    id: InstructionIdSchema,
    type: z.literal("split"),
    by: z.literal("direction"),
    ups: z.array(AtomicInstructionSchema),
    downs: z.array(AtomicInstructionSchema),
  }),
]);
export type Split = z.infer<typeof SplitSchema>;

/**
 * Animator for splits: independently chains each group's atomic instructions
 * (e.g. larks vs robins), then stitches the correct proto states together.
 * The `animate` method evaluates both sub-animations at time `t` and merges them.
 */
export const splitAnimator =
  (instr: Split): Animator =>
  (init, who) => {
    switch (instr.by) {
      case "role": {
        const larks = chainAnimators(
          instr.larks.map(makeAtomicInstructionAnimator),
        )(init, new Set(LARK_PROTO_IDS.filter((id) => who.has(id))));
        const robins = chainAnimators(
          instr.robins.map(makeAtomicInstructionAnimator),
        )(init, new Set(ROBIN_PROTO_IDS.filter((id) => who.has(id))));
        return {
          dur: Math.max(larks.dur, robins.dur),
          getFrame(t) {
            // Each side may have a different duration. When one side finishes
            // early, those dancers hold their final positions while the other
            // side continues, so we clamp t to each side's duration.
            const larksKf = larks.getFrame(Math.min(t, larks.dur));
            const robinsKf = robins.getFrame(Math.min(t, robins.dur));
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
        const ups = chainAnimators(
          instr.ups.map(makeAtomicInstructionAnimator),
        )(init, new Set(UP_PROTO_IDS.filter((id) => who.has(id))));
        const downs = chainAnimators(
          instr.downs.map(makeAtomicInstructionAnimator),
        )(init, new Set(DOWN_PROTO_IDS.filter((id) => who.has(id))));
        return {
          dur: Math.max(ups.dur, downs.dur),
          getFrame(t) {
            // Each side may have a different duration. When one side finishes
            // early, those dancers hold their final positions while the other
            // side continues, so we clamp t to each side's duration.
            const upsKf = ups.getFrame(Math.min(t, ups.dur));
            const downsKf = downs.getFrame(Math.min(t, downs.dur));
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
