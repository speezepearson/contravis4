import { z } from "zod";

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { PI } from "../geometry";
import { getDancerState, type WorldState } from "../worldState";
import {
  findDancerInCalledDirection,
  instructionBaseSchemaFields,
  resolveMatch,
} from "./_base";
import { linearTo, type SegmentAnimator } from "./_segment";

export const BoxCirculateInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("box_circulate"),
});
export type BoxCirculateInstruction = z.infer<
  typeof BoxCirculateInstructionSchema
>;

function facesOut(id: ProtoId, state: WorldState): boolean {
  const { facing, pos } = state[id];
  return (pos.x < 0 && facing.x < 0) || (pos.x > 0 && facing.x > 0);
}

function facesAcross(id: ProtoId, state: WorldState): boolean {
  const { facing, pos } = state[id];
  return (pos.x < 0 && facing.x > 0) || (pos.x > 0 && facing.x < 0);
}

export const boxCirculateSegments =
  (instr: BoxCirculateInstruction): SegmentAnimator =>
  (init) => {
    for (const id of ALL_PROTO_IDS) {
      if (!facesOut(id, init) && !facesAcross(id, init)) {
        throw new Error(
          `boxCirculate requires every dancer to face out or across`,
        );
      }
    }

    const isOut: Record<string, boolean> = {};
    const targets: Partial<
      Record<ProtoId, ReturnType<typeof getDancerState>["pos"]>
    > = {};

    for (const id of ALL_PROTO_IDS) {
      isOut[id] = facesOut(id, init);
      if (isOut[id]) {
        const them = resolveMatch(id, "in right hand", init);
        targets[id] = getDancerState(them, init).pos;
      } else {
        const them = findDancerInCalledDirection(id, "in_front", init);
        if (!them) {
          throw new Error(
            `boxCirculate: ${id} faces across but has no dancer in front`,
          );
        }
        targets[id] = getDancerState(them, init).pos;
      }
    }

    return [
      {
        dur: instr.beats,
        position: linearTo((id) => targets[id]!),
        facing: (id: ProtoId, frac: number, segInit: WorldState) => {
          if (isOut[id]) {
            return segInit[id].facing.rotateByRadians(-PI * frac);
          }
          return segInit[id].facing;
        },
        hands: () => ({}),
      },
    ];
  };
