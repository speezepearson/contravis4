import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { type WorldState } from "../worldState";
import { instructionBaseSchemaFields } from "./_base";
import {
  evaluateSegmentEnd,
  type Segment,
  type SegmentAnimator,
} from "./_segment";
import { balanceSegments } from "./balance";
import { faceSegments } from "./face";
import { pullBySegments } from "./pullBy";
import { takeHandsSegments } from "./takeHands";

export const SquareThroughInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("square_through"),
});
export type SquareThroughInstruction = z.infer<
  typeof SquareThroughInstructionSchema
>;

function advanceState(
  segs: Segment[],
  state: WorldState,
  who: Set<ProtoId>,
): WorldState {
  let s = state;
  for (const seg of segs) s = evaluateSegmentEnd(seg, s, who);
  return s;
}

export const squareThroughSegments =
  (instr: SquareThroughInstruction): SegmentAnimator =>
  (init, who) => {
    const id = instr.id;
    const balanceBeats = instr.beats / 2;
    const pullByBeats = instr.beats / 4;

    let state = init;
    const allSegments: Segment[] = [];

    function append(segs: Segment[]) {
      allSegments.push(...segs);
      state = advanceState(segs, state, who);
    }

    // 1. Face across
    append(
      faceSegments({ id, beats: 0, type: "face", direction: "across" })(
        state,
        who,
      ),
    );

    // 2. Take right hands with person in front
    append(
      takeHandsSegments({
        id,
        beats: 0,
        type: "take_hands",
        cid: "in_front",
        hand: "right",
      })(state, who),
    );

    // 3. Balance toward person in front
    append(
      balanceSegments({
        id,
        beats: balanceBeats,
        type: "balance",
        did: "in_front",
      })(state, who),
    );

    // 4. Pull by right
    append(
      pullBySegments({
        id,
        beats: pullByBeats,
        type: "pull_by",
        cid: "in right hand",
        hand: "right",
      })(state, who),
    );

    // 5. Turn: larks right, robins left
    append(
      faceSegments({
        id,
        beats: 0,
        type: "face",
        direction: "larks_right_robins_left",
      })(state, who),
    );

    // 6. Pull by left with person in front
    append(
      pullBySegments({
        id,
        beats: pullByBeats,
        type: "pull_by",
        cid: "in_front",
        hand: "left",
      })(state, who),
    );

    return allSegments;
  };
