import { Vector } from "vecti";
import { z } from "zod";

import { ALL_PROTO_IDS, parseProtoId, type ProtoId } from "../contraCore";
import { NORTH, SOUTH } from "../geometry";
import { connectHands } from "../worldState";
import {
  findDancerInCalledDirection,
  instructionBaseSchemaFields,
} from "./_base";
import { type SegmentAnimator } from "./_segment";

export const FormShortWavesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("form_short_waves"),
  beats: z.literal(0),
});
export type FormShortWavesInstruction = z.infer<
  typeof FormShortWavesInstructionSchema
>;

const SHORT_WAVES_XS = [-0.75, -0.25, 0.25, 0.75] as const;

export const formShortWavesSegments =
  (_instr: FormShortWavesInstruction): SegmentAnimator =>
  (init, who) => {
    if (who.size !== ALL_PROTO_IDS.length)
      throw new Error(`formShortWaves instruction must target all dancers`);

    const protosWestToEast = ([...ALL_PROTO_IDS] as ProtoId[]).sort(
      (a, b) => init[a].pos.x - init[b].pos.x,
    );
    if (
      parseProtoId(protosWestToEast[1]).role !==
      parseProtoId(protosWestToEast[2]).role
    ) {
      throw new Error(`dancers in middle of short waves do not have same role`);
    }

    const positions = new Map<ProtoId, Vector>();
    const facings = new Map<ProtoId, Vector>();
    for (let i = 0; i < 4; i++) {
      const id = protosWestToEast[i];
      facings.set(id, init[id].facing.y > 0 ? NORTH : SOUTH);
      positions.set(id, new Vector(SHORT_WAVES_XS[i], init[id].pos.y));
    }

    for (let i = 0; i < 3; i++) {
      const id = protosWestToEast[i];
      const nextId = protosWestToEast[i + 1];
      if (facings.get(id)!.y === facings.get(nextId)!.y) {
        throw new Error(
          `adjacent dancers in short waves are facing the same way`,
        );
      }
    }

    return [
      {
        dur: 0,
        position: (id) => positions.get(id)!,
        facing: (id) => facings.get(id)!,
        hands: (id, _frac, segInit, draft) => {
          const left = findDancerInCalledDirection(id, "on_left", segInit);
          const right = findDancerInCalledDirection(id, "on_right", segInit);
          if (left) connectHands(draft, id, "left", left, "left");
          if (right) connectHands(draft, id, "right", right, "right");
        },
      },
    ];
  };
