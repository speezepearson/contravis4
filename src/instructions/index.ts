import { produce } from "immer";
import { Vector } from "vecti";
import { z } from "zod";

import { ALL_PROTO_IDS, type Beats, type ProtoId } from "../contraCore";
import { EAST, NORTH, SOUTH, WEST } from "../geometry";
import { typedParse } from "../utils";
import { type WorldState, WorldStateSchema } from "../worldState";
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

export const InitFormationNameSchema = z.enum([
  "improper",
  "becket",
  "becket_ccw",
  "proper",
]);
export type InitFormationName = z.infer<typeof InitFormationNameSchema>;

export const InitFormationSchema = z.union([
  InitFormationNameSchema,
  WorldStateSchema,
]);
export type InitFormation = z.infer<typeof InitFormationSchema>;

export function resolveInitFormation(initFormation: InitFormation): WorldState {
  if (typeof initFormation === "string") {
    return initFormationStates[initFormation];
  }
  return initFormation;
}

const improper = typedParse(WorldStateSchema, {
  up_lark_0: {
    pos: { x: -0.5, y: -0.5 },
    facing: NORTH,
    hands: {},
    labels: {
      partner: "up_robin_0",
      neighbor: "down_robin_0",
    },
    recents: ["up_robin_0", "down_robin_0"],
  },
  up_robin_0: {
    pos: { x: 0.5, y: -0.5 },
    facing: NORTH,
    hands: {},
    labels: {
      partner: "up_lark_0",
      neighbor: "down_lark_0",
    },
    recents: ["up_lark_0", "down_lark_0"],
  },
  down_lark_0: {
    pos: { x: 0.5, y: 0.5 },
    facing: SOUTH,
    hands: {},
    labels: {
      partner: "down_robin_0",
      neighbor: "up_robin_0",
    },
    recents: ["down_robin_0", "up_robin_0"],
  },
  down_robin_0: {
    pos: { x: -0.5, y: 0.5 },
    facing: SOUTH,
    hands: {},
    labels: {
      partner: "down_lark_0",
      neighbor: "up_lark_0",
    },
    recents: ["down_lark_0", "up_lark_0"],
  },
});
const initFormationPosFacings: Record<
  InitFormationName,
  Record<ProtoId, { pos: Vector; facing: Vector }>
> = {
  improper: {
    up_lark_0: { pos: new Vector(-0.5, -0.5), facing: NORTH },
    up_robin_0: { pos: new Vector(0.5, -0.5), facing: NORTH },
    down_lark_0: { pos: new Vector(0.5, 0.5), facing: SOUTH },
    down_robin_0: { pos: new Vector(-0.5, 0.5), facing: SOUTH },
  },
  becket: {
    up_lark_0: { pos: new Vector(-0.5, 0.5), facing: EAST },
    up_robin_0: { pos: new Vector(-0.5, -0.5), facing: EAST },
    down_lark_0: { pos: new Vector(0.5, -0.5), facing: WEST },
    down_robin_0: { pos: new Vector(0.5, 0.5), facing: WEST },
  },
  becket_ccw: {
    up_lark_0: { pos: new Vector(0.5, -0.5), facing: WEST },
    up_robin_0: { pos: new Vector(0.5, 0.5), facing: WEST },
    down_lark_0: { pos: new Vector(-0.5, 0.5), facing: EAST },
    down_robin_0: { pos: new Vector(-0.5, -0.5), facing: EAST },
  },
  proper: {
    up_lark_0: { pos: new Vector(-0.5, -0.5), facing: NORTH },
    up_robin_0: { pos: new Vector(0.5, -0.5), facing: NORTH },
    down_lark_0: { pos: new Vector(-0.5, 0.5), facing: SOUTH },
    down_robin_0: { pos: new Vector(0.5, 0.5), facing: SOUTH },
  },
};

export const initFormationStates: Record<InitFormationName, WorldState> = {
  improper: buildInitFormation("improper"),
  becket: buildInitFormation("becket"),
  becket_ccw: buildInitFormation("becket_ccw"),
  proper: buildInitFormation("proper"),
};
function buildInitFormation(initFormationName: InitFormationName): WorldState {
  return produce(improper, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      draft[id].pos = initFormationPosFacings[initFormationName][id].pos;
      draft[id].facing = initFormationPosFacings[initFormationName][id].facing;
    }
  });
}

export const DanceStatusSchema = z.enum(["dummy", "preliminary", "verified"]);
export type DanceStatus = z.infer<typeof DanceStatusSchema>;

export const DanceSchema = z.object({
  status: DanceStatusSchema.default("preliminary"),
  url: z.string().optional(),
  name: z.string().optional(),
  author: z.string().optional(),
  initFormation: InitFormationSchema,
  instructions: z.array(InstructionSchema),
});
export type Dance = z.infer<typeof DanceSchema>;
