import { z } from "zod";

import { ccwRadsBetween, getDir, TWO_PI } from "../geometry";
import { must } from "../utils";
import { buildProtoRecord, getDancerState } from "../worldState";
import {
  avgDancerPos,
  instructionBaseSchemaFields,
  resolveRings,
} from "./_base";
import {
  disconnect,
  linearTo,
  rotateFacingBy,
  type SegmentAnimator,
} from "./_segment";

export const PetronellaInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("petronella"),
});
export type PetronellaInstruction = z.infer<typeof PetronellaInstructionSchema>;

export const petronellaSegments =
  (instr: PetronellaInstruction): SegmentAnimator =>
  (init) => {
    const rings = resolveRings(init);
    const centers = buildProtoRecord((id) => avgDancerPos(rings[id], init));

    const targets = buildProtoRecord((id) => {
      const { theirId } = must(init[id].hands.get("right"));
      const targetPos = getDancerState(theirId, init).pos;
      const targetFacing = getDir({ from: targetPos, to: centers[id] });
      // Always rotate CW: if ccwRadsBetween gives positive, subtract 2PI
      const ccwAngle = ccwRadsBetween(init[id].facing, targetFacing);
      const cwAngle = ccwAngle > 0 ? ccwAngle - TWO_PI : ccwAngle;
      return { targetPos, cwAngle };
    });

    return [
      {
        dur: instr.beats,
        position: linearTo((id) => targets[id].targetPos),
        facing: rotateFacingBy((id) => targets[id].cwAngle),
        hands: disconnect(),
      },
    ];
  };
