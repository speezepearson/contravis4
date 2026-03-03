import type z from "zod";

import type { Role } from "../contraCore";
import {
  type CalledDirection,
  type CalledIdentifier,
  type CardinalDirection,
  InstructionIdSchema,
} from "../instructions/_base";
import {
  type Instruction,
  type InstructionId,
  InstructionSchema,
} from "../instructions/index";
import { assertNever } from "../utils";
import type { ActionOptionType } from "./CommandPane";

/** Props for inline field components. */
export interface SubFormProps {
  onChange: (instr: Instruction) => void;
  onInvalid?: () => void;
}

/** Create a default instruction for a given type. */
export function makeDefaultInstruction(
  type: ActionOptionType,
  id: InstructionId,
): Instruction {
  const unverified = ((): z.input<typeof InstructionSchema> => {
    switch (type) {
      case "allemande":
        return {
          id,
          type: "allemande",
          beats: 8,
          cid: "neighbor",
          handedness: "right",
          rotations: 1,
        };
      case "balance":
        return { id, type: "balance", beats: 4, cid: "neighbor" };
      case "balance_the_ring":
        return { id, type: "balance_the_ring", beats: 4 };
      case "box_the_gnat":
        return { id, type: "box_the_gnat", beats: 4, cid: "neighbor" };
      case "california_twirl":
        return { id, type: "california_twirl", beats: 4, cid: "partner" };
      case "circle":
        return {
          id,
          type: "circle",
          beats: 8,
          direction: "left",
          rotations: 1,
        };
      case "do_si_do":
        return {
          id,
          type: "do_si_do",
          beats: 8,
          cid: "neighbor",
          rotations: 1,
        };
      case "drop_hands":
        return { id, type: "drop_hands", beats: 0, which: "both" };
      case "face":
        return { id, type: "face", beats: 0, direction: "across" };
      case "form_short_waves":
        return { id, type: "form_short_waves", beats: 0 };
      case "give_and_take_into_swing":
        return {
          id,
          type: "give_and_take_into_swing",
          beats: 16,
          cid: "neighbor",
          drawerRole: "lark",
          endFacing: "across",
        };
      case "pass_by":
        return {
          id,
          type: "pass_by",
          beats: 2,
          cid: "neighbor",
          hand: "right",
        };
      case "petronella":
        return { id, type: "petronella", beats: 4 };
      case "pull_by":
        return {
          id,
          type: "pull_by",
          beats: 2,
          cid: "neighbor",
          hand: "right",
        };
      case "relabel":
        return {
          id,
          type: "relabel",
          beats: 0,
          label: "neighbor",
          cid: "in_front",
        };
      case "roll_away":
        return { id, type: "roll_away", roller: "lark", rollee: "on_right" };
      case "rory_o_more":
        return { id, type: "rory_o_more", beats: 4, direction: "right" };
      case "split":
        return { id, type: "split", by: "role", larks: [], robins: [] };
      case "step":
        return {
          id,
          type: "step",
          beats: 1,
          direction: "in_front",
          distance: 0,
          facing: "across",
        };
      case "swing":
        return {
          id,
          type: "swing",
          beats: 16,
          cid: "neighbor",
          endFacing: "across",
        };
      case "take_hands_in_rings":
        return { id, type: "take_hands_in_rings", beats: 0 };
      case "take_hands":
        return {
          id,
          type: "take_hands",
          beats: 0,
          cid: "neighbor",
          hand: "right",
        };
      default:
        assertNever(type);
    }
  })();
  return InstructionSchema.parse(unverified);
}

export function makeInstructionId(): InstructionId {
  return InstructionIdSchema.parse(crypto.randomUUID());
}

export function cardinalDirectionToText(dir: CardinalDirection): string {
  return dir;
}

export function calledDirectionToText(cid: CalledDirection): string {
  switch (cid) {
    case "on_right":
      return "your right";
    case "on_left":
      return "your left";
    case "in_front":
      return "forward";
    case "behind":
      return "backward";
    case "left_diagonal":
      return "left diagonal";
    case "right_diagonal":
      return "right diagonal";
    case "larks_left_robins_right":
      return "your (larks left, robins right)";
    case "larks_right_robins_left":
      return "your (larks right, robins left)";
    case "across":
      return "across";
    case "out":
      return "out";
    case "up":
      return "up";
    case "down":
      return "down";
    case "neighbor":
      return "towards your neighbor";
    case "partner":
      return "towards your partner";
    case "shadow":
      return "towards your shadow";
    case "opposite":
      return "towards your opposite";
    case "next neighbor":
      return "towards your next neighbor";
    case "next x2 neighbor":
      return "towards your next x2 neighbor";
    case "next x3 neighbor":
      return "towards your next x3 neighbor";
    case "prev neighbor":
      return "towards your prev neighbor";
    case "prev x2 neighbor":
      return "towards your prev x2 neighbor";
    case "prev x3 neighbor":
      return "towards your prev x3 neighbor";
    case "shadow 2":
      return "towards your shadow 2";
    case "shadow 3":
      return "towards your shadow 3";
    case "shadow 4":
      return "towards your shadow 4";
    case "shadow 5":
      return "towards your shadow 5";
    case "shadow 6":
      return "towards your shadow 6";
    default:
      assertNever(cid);
  }
}

export function calledIdentifierToText(cid: CalledIdentifier): string {
  switch (cid) {
    case "on_right":
      return "the person on your right";
    case "on_left":
      return "the person on your left";
    case "in_front":
      return "the person in front of you";
    case "behind":
      return "the person behind you";
    case "left_diagonal":
      return "the person on your left diagonal";
    case "right_diagonal":
      return "the person on your right diagonal";
    case "larks_left_robins_right":
      return "the person on your (larks left, robins right)";
    case "larks_right_robins_left":
      return "the person on your (larks right, robins left)";
    case "across":
      return "the person across from you";
    case "out":
      return "the person on the other side of the room";
    case "up":
      return "the person above you";
    case "down":
      return "the person below you";
    case "neighbor":
      return "your neighbor";
    case "partner":
      return "your partner";
    case "shadow":
      return "your shadow";
    case "opposite":
      return "your opposite";
    case "next neighbor":
      return "your next neighbor";
    case "next x2 neighbor":
      return "your next x2 neighbor";
    case "next x3 neighbor":
      return "your next x3 neighbor";
    case "prev neighbor":
      return "your prev neighbor";
    case "prev x2 neighbor":
      return "your prev x2 neighbor";
    case "prev x3 neighbor":
      return "your prev x3 neighbor";
    case "shadow 2":
      return "your shadow 2";
    case "shadow 3":
      return "your shadow 3";
    case "shadow 4":
      return "your shadow 4";
    case "shadow 5":
      return "your shadow 5";
    case "shadow 6":
      return "your shadow 6";
    default:
      assertNever(cid);
  }
}

export const DIR_OPTIONS = [
  "up",
  "down",
  "across",
  "out",
  "progression",
  "forward",
  "back",
  "right",
  "left",
  "partner",
  "neighbor",
  "opposite",
];

export const DROP_WHICH_OPTIONS: string[] = [
  "both",
  "left",
  "right",
  "partner",
  "shadow",
  "neighbor",
];
export const DROP_WHICH_LABELS: Record<string, string> = {
  both: "both hands",
  left: "left hand",
  right: "right hand",
  partner: "partner hands",
  shadow: "shadow hands",
  neighbor: "neighbor hands",
};

export const HAND_OPTIONS = ["right", "left"];
export const TAKE_HAND_OPTIONS = ["right", "left", "inside"];

export const ROLE_OPTIONS: Role[] = ["lark", "robin"];

export const SPLIT_BY_OPTIONS = ["role", "direction"];
export const SPLIT_BY_LABELS: Record<string, string> = {
  role: "role (larks / robins)",
  direction: "direction (ups / downs)",
};
