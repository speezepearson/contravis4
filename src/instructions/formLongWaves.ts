import { produce } from "immer";
import { z } from "zod";

import { ALL_PROTO_IDS, parseProtoId } from "../contraCore";
import { EAST, WEST } from "../geometry";
import { connectHands } from "../worldState";
import { instructionBaseSchemaFields, resolveMatches } from "./_base";
import { makeImmediateSegment, type SegmentAnimator } from "./_segment";

export const FormLongWavesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("form_long_waves"),
  beats: z.literal(0),
});
export type FormLongWavesInstruction = z.infer<
  typeof FormLongWavesInstructionSchema
>;

export const formLongWavesSegments =
  (_instr: FormLongWavesInstruction): SegmentAnimator =>
  (init, who) => {
    if (who.size !== ALL_PROTO_IDS.length)
      throw new Error(`formLongWaves instruction must target all dancers`);

    // Assert one lark on each side, one robin on each side
    for (const role of ["lark", "robin"] as const) {
      const protos = ALL_PROTO_IDS.filter(
        (id) => parseProtoId(id).role === role,
      );
      const hasLeft = protos.some((id) => init[id].pos.x < 0);
      const hasRight = protos.some((id) => init[id].pos.x > 0);
      if (!hasLeft || !hasRight)
        throw new Error(
          `formLongWaves requires one ${role} on each side of the set`,
        );
    }

    // Snap facings to across or out (whichever is closer = EAST or WEST)
    const snappedState = produce(init, (draft) => {
      for (const id of ALL_PROTO_IDS) {
        draft[id].facing = draft[id].facing.x >= 0 ? EAST : WEST;
      }
    });

    // Assert that either larks face out & robins across, or vice versa.
    // "across" = toward center (x<0 → EAST, x>0 → WEST)
    // "out" = away from center (x<0 → WEST, x>0 → EAST)
    function facesOut(id: (typeof ALL_PROTO_IDS)[number]): boolean {
      const facing = snappedState[id].facing;
      const x = snappedState[id].pos.x;
      // out means facing away from center
      return (x < 0 && facing.x < 0) || (x > 0 && facing.x > 0);
    }

    const larkIds = ALL_PROTO_IDS.filter(
      (id) => parseProtoId(id).role === "lark",
    );
    const robinIds = ALL_PROTO_IDS.filter(
      (id) => parseProtoId(id).role === "robin",
    );
    const larksOut = larkIds.every(facesOut);
    const larksAcross = larkIds.every((id) => !facesOut(id));
    const robinsOut = robinIds.every(facesOut);
    const robinsAcross = robinIds.every((id) => !facesOut(id));
    if (!((larksOut && robinsAcross) || (larksAcross && robinsOut))) {
      throw new Error(
        `formLongWaves requires all larks facing the same way (across or out) and all robins the opposite`,
      );
    }

    // Every dancer must have somebody on their left and right; resolveMatches
    // throws (via getCycle) if any dancer lacks a match on either side.
    const leftMatches = resolveMatches("on_left", snappedState);
    const rightMatches = resolveMatches("on_right", snappedState);

    return [
      makeImmediateSegment(init, (id, draft) => {
        draft[id].facing = snappedState[id].facing;
        connectHands(draft, id, "left", leftMatches[id], "left");
        connectHands(draft, id, "right", rightMatches[id], "right");
      }),
    ];
  };
