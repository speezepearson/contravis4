import { Vector } from "vecti";
import { z } from "zod";

import { ALL_PROTO_IDS, getRole } from "../contraCore";
import { NORTH, SOUTH } from "../geometry";
import { indexOf, must } from "../utils";
import { connectHands, Dancer } from "../worldState";
import {
  findDancerInCalledDirection,
  instructionBaseSchemaFields,
  resolveShortLines,
} from "./_base";
import { type InstructionAnimator, makeImmediateSegment } from "./_segment";

export const FormShortWavesInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("form_short_waves"),
  beats: z.literal(0),
});
export type FormShortWavesInstruction = z.infer<
  typeof FormShortWavesInstructionSchema
>;

const SHORT_WAVES_XS = [-0.75, -0.25, 0.25, 0.75] as const;

export const formShortWavesSegments: InstructionAnimator<
  FormShortWavesInstruction
> = (_instr, init, who) => {
  if (who.size !== ALL_PROTO_IDS.length)
    throw new Error(`formShortWaves instruction must target all dancers`);

  const shortLines = resolveShortLines(init);
  for (const id of ALL_PROTO_IDS) {
    const line = shortLines[id];
    if (getRole(line[1]) !== getRole(line[2])) {
      throw new Error(`dancers in middle of short waves do not have same role`);
    }
    for (let i = 0; i < 3; i++) {
      const isUp = Dancer.get(line[i], init).facing.y > 0;
      const nextIsUp = Dancer.get(line[i + 1], init).facing.y > 0;
      if (isUp === nextIsUp) {
        throw new Error(
          `short waves should have dancers alternating facing up/down, but ${line[i]} and ${line[i + 1]} are both facing ${isUp ? "up" : "down"}`,
        );
      }
    }
  }

  return [
    makeImmediateSegment(init, (id, draft) => {
      const i = must(indexOf(shortLines[id], id));
      draft[id].facing = init[id].facing.y > 0 ? NORTH : SOUTH;
      draft[id].pos = new Vector(SHORT_WAVES_XS[i], init[id].pos.y).add(
        draft[id].facing.multiply(-0.1),
      );
      const onLeft = findDancerInCalledDirection(id, "on_left", draft);
      const onRight = findDancerInCalledDirection(id, "on_right", draft);
      if (onLeft) connectHands(draft, id, "left", onLeft, "left");
      if (onRight) connectHands(draft, id, "right", onRight, "right");
    }),
  ];
};
