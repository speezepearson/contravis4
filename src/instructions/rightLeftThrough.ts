import { z } from "zod";

import { instructionBaseSchemaFields } from "./_base";
import { advanceState, type Segment, type SegmentAnimator } from "./_segment";
import { courtesyTurnSegments } from "./courtesyTurn";
import { pullBySegments } from "./pullBy";

export const RightLeftThroughInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("right_left_through"),
});
export type RightLeftThroughInstruction = z.infer<
  typeof RightLeftThroughInstructionSchema
>;

export const rightLeftThroughSegments =
  (instr: RightLeftThroughInstruction): SegmentAnimator =>
  (init, who) => {
    const { id } = instr;
    const pullByBeats = instr.beats / 2;
    const courtesyTurnBeats = instr.beats / 2;

    let state = init;
    const allSegments: Segment[] = [];

    // TODO: this `append` business is kinda inelegant. Wouldn't it be nice to be able to just `return [...pullBySegments(...), ...courtesyTurnSegments(...)]`?
    function append(segs: Segment[]) {
      allSegments.push(...segs);
      state = advanceState(segs, state, who);
    }

    // 1. Pull by right with person across
    append(
      pullBySegments({
        id,
        beats: pullByBeats,
        type: "pull_by",
        cid: "across",
        hand: "right",
      })(state, who),
    );

    // 2. Courtesy turn
    append(
      courtesyTurnSegments({
        id,
        beats: courtesyTurnBeats,
        type: "courtesy_turn",
      })(state, who),
    );

    return allSegments;
  };
