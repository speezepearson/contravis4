import { Vector } from "vecti";
import { z } from "zod";

import { type Beats } from "../contraCore";
import { EAST, NORTH, SOUTH, WEST } from "../geometry";
import type { WorldState } from "../worldState";
import { AtomicInstructionSchema } from "./_atomic";
import { getSplitDuration, SplitSchema } from "./split";

export { type InstructionId, InstructionIdSchema } from "./_base";

export const InstructionSchema = z.discriminatedUnion("type", [
  AtomicInstructionSchema,
  SplitSchema,
]);
export type Instruction = z.infer<typeof InstructionSchema>;

export function instructionDuration(instr: Instruction): Beats {
  switch (instr.type) {
    case "split":
      return getSplitDuration(instr);
    default:
      return instr.beats;
  }
}

export function danceLength(instructions: Instruction[]): Beats {
  return Math.max(
    4,
    instructions.reduce((s, i) => s + instructionDuration(i), 0),
  );
}

export const InitFormationSchema = z.enum(["improper", "beckett"]);
export type InitFormation = z.infer<typeof InitFormationSchema>;

export const initFormationStates: Record<InitFormation, WorldState> = {
  improper: {
    up_lark_0: {
      protoId: "up_lark_0",
      pos: new Vector(-0.5, -0.5),
      facing: NORTH,
      hands: new Map(), // TODO: it sure would be nice to know this was readonly
      labels: new Map([
        ["partner", "up_robin_0"],
        ["neighbor", "down_robin_0"],
      ]),
    },
    up_robin_0: {
      protoId: "up_robin_0",
      pos: new Vector(0.5, -0.5),
      facing: NORTH,
      hands: new Map(),
      labels: new Map([
        ["partner", "up_lark_0"],
        ["neighbor", "down_lark_0"],
      ]),
    },
    down_lark_0: {
      protoId: "down_lark_0",
      pos: new Vector(0.5, 0.5),
      facing: SOUTH,
      hands: new Map(),
      labels: new Map([
        ["partner", "down_robin_0"],
        ["neighbor", "up_robin_0"],
      ]),
    },
    down_robin_0: {
      protoId: "down_robin_0",
      pos: new Vector(-0.5, 0.5),
      facing: SOUTH,
      hands: new Map(),
      labels: new Map([
        ["partner", "down_lark_0"],
        ["neighbor", "up_lark_0"],
      ]),
    },
  },
  beckett: {
    up_lark_0: {
      protoId: "up_lark_0",
      pos: new Vector(-0.5, 0.5),
      facing: EAST,
      hands: new Map(),
      labels: new Map([
        ["partner", "up_robin_0"],
        ["neighbor", "down_robin_0"],
      ]),
    },
    up_robin_0: {
      protoId: "up_robin_0",
      pos: new Vector(-0.5, -0.5),
      facing: EAST,
      hands: new Map(),
      labels: new Map([
        ["partner", "up_lark_0"],
        ["neighbor", "down_lark_0"],
      ]),
    },
    down_lark_0: {
      protoId: "down_lark_0",
      pos: new Vector(0.5, -0.5),
      facing: WEST,
      hands: new Map(),
      labels: new Map([
        ["partner", "down_robin_0"],
        ["neighbor", "up_robin_0"],
      ]),
    },
    down_robin_0: {
      protoId: "down_robin_0",
      pos: new Vector(0.5, 0.5),
      facing: WEST,
      hands: new Map(),
      labels: new Map([
        ["partner", "down_lark_0"],
        ["neighbor", "up_lark_0"],
      ]),
    },
  },
};

export const DanceSchema = z.object({
  name: z.string().optional(),
  author: z.string().optional(),
  initFormation: InitFormationSchema,
  instructions: z.array(InstructionSchema),
});
export type Dance = z.infer<typeof DanceSchema>;
