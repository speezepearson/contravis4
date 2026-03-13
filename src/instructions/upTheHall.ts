import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { NORTH } from "../geometry";
import { type WorldState } from "../worldState";
import { type ContraAnimation, instructionBaseSchemaFields } from "./_base";
import { theHallAnimator } from "./downTheHall";

export const UpTheHallInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("up_the_hall"),
  distance: z.number(),
});
export type UpTheHallInstruction = z.infer<typeof UpTheHallInstructionSchema>;

export function upTheHallAnimator(
  instr: UpTheHallInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return theHallAnimator(NORTH, "up", instr, init, who);
}
