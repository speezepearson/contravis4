import { Vector } from "vecti";
import { z } from "zod";

import { ALL_PROTO_IDS, getRole } from "../contraCore";
import { resolveShortLines } from "../formations";
import { NORTH, SOUTH } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { indexOf, must, safeThreshold } from "../utils";
import { connectHands, Dancer } from "../worldState";
import { instructionBaseSchemaFields } from "./_base";
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
      const isUp = must(
        safeThreshold(Dancer.get(line[i], init).facing.y, {
          neg: "down",
          pos: "up",
        } as const),
        [{ dancerId: line[i] }, " is not facing up or down"],
      );
      const nextIsUp = must(
        safeThreshold(Dancer.get(line[i + 1], init).facing.y, {
          neg: "down",
          pos: "up",
        } as const),
        [{ dancerId: line[i + 1] }, " is not facing up or down"],
      );
      if (isUp === nextIsUp) {
        throw new SnazzyError([
          "short waves should have dancers alternating facing up/down, but ",
          { dancerId: line[i] },
          " and ",
          { dancerId: line[i + 1] },
          " are both facing ",
          isUp ? "up" : "down",
        ]);
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
      const onLeft = Dancer.get(id, draft).findDancerInCalledDirection(
        "on_left",
      );
      const onRight = Dancer.get(id, draft).findDancerInCalledDirection(
        "on_right",
      );
      if (onLeft) connectHands(draft, id, "left", onLeft.id, "left");
      if (onRight) connectHands(draft, id, "right", onRight.id, "right");
    }),
  ];
};
