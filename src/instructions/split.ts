import { z } from "zod";
import {
  chainAnimations,
  InstructionIdSchema,
  type InstructionAnimator,
} from "./_base";
import {
  type Beats,
  LARK_PROTO_IDS,
  ROBIN_PROTO_IDS,
  UP_PROTO_IDS,
  DOWN_PROTO_IDS,
} from "../contraCore";
import { assertNever } from "../utils";
import { animateAtomicInstruction, AtomicInstructionSchema } from "./_atomic";

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
export const splitAnimator: InstructionAnimator<Split> = (init, who, instr) => {
  switch (instr.by) {
    case "role": {
      const larks = chainAnimations(
        instr.larks.map((i) =>
          animateAtomicInstruction(
            init,
            new Set(LARK_PROTO_IDS.filter((id) => who.has(id))),
            i,
          ),
        ),
      );
      const robins = chainAnimations(
        instr.robins.map((i) =>
          animateAtomicInstruction(
            init,
            new Set(ROBIN_PROTO_IDS.filter((id) => who.has(id))),
            i,
          ),
        ),
      );
      return {
        dur: Math.max(larks.dur, robins.dur),
        getFrame(t) {
          const larksKf = larks.getFrame(t);
          const robinsKf = robins.getFrame(t);
          return {
            beat: t,
            protos: {
              up_lark_0: larksKf.protos["up_lark_0"],
              up_robin_0: robinsKf.protos["up_robin_0"],
              down_lark_0: larksKf.protos["down_lark_0"],
              down_robin_0: robinsKf.protos["down_robin_0"],
            },
          };
        },
      };
    }
    case "direction": {
      const ups = chainAnimations(
        instr.ups.map((i) =>
          animateAtomicInstruction(
            init,
            new Set(UP_PROTO_IDS.filter((id) => who.has(id))),
            i,
          ),
        ),
      );
      const downs = chainAnimations(
        instr.downs.map((i) =>
          animateAtomicInstruction(
            init,
            new Set(DOWN_PROTO_IDS.filter((id) => who.has(id))),
            i,
          ),
        ),
      );
      return {
        dur: Math.max(ups.dur, downs.dur),
        getFrame(t) {
          const upsKf = ups.getFrame(t);
          const downsKf = downs.getFrame(t);
          return {
            beat: t,
            protos: {
              up_lark_0: upsKf.protos["up_lark_0"],
              up_robin_0: upsKf.protos["up_robin_0"],
              down_lark_0: downsKf.protos["down_lark_0"],
              down_robin_0: downsKf.protos["down_robin_0"],
            },
          };
        },
      };
    }
    default:
      assertNever(instr);
  }
};

export function getSplitDuration(split: Split): Beats {
  const instrs =
    split.by === "role"
      ? [...split.larks, ...split.robins]
      : [...split.ups, ...split.downs];
  return Math.max(...instrs.map((i) => i.beats));
}
