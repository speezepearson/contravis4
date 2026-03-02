import { produce } from "immer";
import { Vector } from "vecti";
import { z } from "zod";

import { ALL_PROTO_IDS, parseProtoId } from "../contraCore";
import { NORTH, SOUTH } from "../geometry";
import { connectHands } from "../worldState";
import {
  type Animator,
  findDancerOnSide,
  instructionBaseSchemaFields,
} from "./_base";

export const FormShortWavesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("form_short_waves"),
  beats: z.literal(0),
});
export type FormShortWavesInstruction = z.infer<
  typeof FormShortWavesInstructionSchema
>;

const SHORT_WAVES_XS = [-0.75, -0.25, 0.25, 0.75] as const;

export const formShortWavesAnimator =
  (_instr: FormShortWavesInstruction): Animator =>
  (init, who) => {
    if (who.size !== ALL_PROTO_IDS.length)
      throw new Error(`formShortWaves instruction must target all dancers`);
    return {
      dur: 0,
      getFrame(_t) {
        return produce(init, (draft) => {
          const protosWestToEast = [...ALL_PROTO_IDS].sort(
            (a, b) => init[a].pos.x - init[b].pos.x,
          );
          if (
            parseProtoId(protosWestToEast[1]).role ===
            parseProtoId(protosWestToEast[2]).role
          ) {
            throw new Error(
              `dancers in middle of short waves do not have same role`,
            );
          }

          for (const id of who) {
            draft[id].facing = draft[id].facing.y > 0 ? NORTH : SOUTH;
          }
          for (let i = 0; i < 3; i++) {
            const id = protosWestToEast[i];
            const nextId = protosWestToEast[i + 1];
            if (draft[id].facing.y === draft[nextId].facing.y) {
              throw new Error(
                `adjacent dancers in short waves are facing the same way`,
              );
            }
          }

          for (let i = 0; i < 4; i++) {
            draft[protosWestToEast[i]].pos = new Vector(
              SHORT_WAVES_XS[i],
              draft[protosWestToEast[i]].pos.y,
            );
          }
          for (const id of who) {
            const left = findDancerOnSide(id, "on_left", draft);
            const right = findDancerOnSide(id, "on_right", draft);
            if (left) connectHands(draft, id, "left", left.rel, "left");
            if (right) connectHands(draft, id, "right", right.rel, "right");
          }
        });
      },
    };
  };
