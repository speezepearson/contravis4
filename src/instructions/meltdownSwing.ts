import { z } from "zod";

import {
  CalledIdentifierSchema,
  CardinalDirectionSchema,
  instructionBaseSchemaFields,
} from "./_base";
import {
  advanceState,
  type InstructionAnimator,
  type Segment,
} from "./_segment";
import { shoulderRoundSegments } from "./shoulderRound";
import { makeSwingSegments } from "./swing";

const SHOULDER_ROUND_BEATS = 8;

export const MeltdownSwingInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("meltdown_swing"),
  cid: CalledIdentifierSchema,
  endFacing: CardinalDirectionSchema,
});
export type MeltdownSwingInstruction = z.infer<
  typeof MeltdownSwingInstructionSchema
>;

export const meltdownSwingSegments: InstructionAnimator<
  MeltdownSwingInstruction
> = (instr, init, who) => {
  const id = instr.id;
  const swingBeats = instr.beats - SHOULDER_ROUND_BEATS;

  let state = init;
  const allSegments: Segment[] = [];

  function append(segs: Segment[]) {
    allSegments.push(...segs);
    state = advanceState(segs, state, who);
  }

  // 1. Right shoulder round 1.5x
  append(
    shoulderRoundSegments(
      {
        id,
        type: "shoulder_round",
        beats: SHOULDER_ROUND_BEATS,
        cid: instr.cid,
        handedness: "right",
        rotations: 1.5,
      },
      state,
      who,
    ),
  );

  // 2. Swing
  append(
    makeSwingSegments(
      {
        id,
        type: "swing",
        beats: swingBeats,
        cid: instr.cid,
        endFacing: instr.endFacing,
      },
      state,
      who,
    ),
  );

  return allSegments;
};
