import type z from "zod";

import type { Role } from "../contraCore";
import {
  type CalledDirection,
  type CalledIdentifier,
  type CardinalDirection,
  InstructionIdSchema,
  PersonInDirectionSchema,
  type PureDirection,
  PureDirectionSchema,
  TowardsLabelDirectionSchema,
} from "../instructions/_base";
import {
  type Instruction,
  type InstructionId,
  InstructionSchema,
} from "../instructions/index";
import { type Label, LabelSchema } from "../labels";
import { assertNever, parses } from "../utils";
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
        return { id, type: "balance", beats: 4, cid: "partner" };
      case "balance_and_swing":
        return {
          id,
          type: "balance_and_swing",
          beats: 16,
          cid: "partner",
          endFacing: "across",
        };
      case "balance_the_ring":
        return { id, type: "balance_the_ring", beats: 4 };
      case "box_circulate":
        return { id, type: "box_circulate", beats: 4 };
      case "box_the_gnat":
        return { id, type: "box_the_gnat", beats: 4, cid: "partner" };
      case "california_twirl":
        return { id, type: "california_twirl", beats: 4 };
      case "circle":
        return {
          id,
          type: "circle",
          beats: 8,
          direction: "left",
          nPlaces: 4,
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
      case "form_long_waves":
        return { id, type: "form_long_waves", beats: 0 };
      case "form_short_waves":
        return { id, type: "form_short_waves", beats: 0 };
      case "give_and_take_into_swing":
        return {
          id,
          type: "give_and_take_into_swing",
          beats: 16,
          cid: "partner",
          drawerRole: "lark",
          endFacing: "across",
        };
      case "long_line_in_center":
        return { id, type: "long_line_in_center", role: "lark", beats: 4 };
      case "long_lines_forward_back":
        return { id, type: "long_lines_forward_back", beats: 8 };
      case "mad_robin":
        return {
          id,
          beats: 8,
          type: "mad_robin",
          cid: "neighbor",
          rotations: 1,
          whoInFront: "lark",
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
      case "poussette":
        return {
          id,
          type: "poussette",
          beats: 8,
          backer: "lark",
          backerDir: "left",
          full: false,
        };
      case "pull_by":
        return {
          id,
          type: "pull_by",
          beats: 2,
          cid: "partner",
          hand: "right",
        };
      case "greet_new_neighbors":
        return {
          id,
          type: "greet_new_neighbors",
          beats: 0,
          cid: "person_in_front",
        };
      case "greet_shadow":
        return {
          id,
          type: "greet_shadow",
          beats: 0,
          cid: "person_in_front",
          label: "shadow",
        };
      case "right_left_through":
        return { id, type: "right_left_through", beats: 8 };
      case "roll_away":
        return {
          id,
          type: "roll_away",
          roller: "lark",
          rollee: "person_on_right",
          beats: 4,
        };
      case "rory_o_more":
        return { id, type: "rory_o_more", beats: 4, direction: "right" };
      case "shoulder_round":
        return {
          id,
          type: "shoulder_round",
          beats: 8,
          cid: "partner",
          handedness: "right",
          rotations: 1,
        };
      case "square_through":
        return { id, type: "square_through", beats: 8 };
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
          cid: "partner",
          endFacing: "across",
        };
      case "take_hands_in_rings":
        return { id, type: "take_hands_in_rings", beats: 0 };
      case "take_hands":
        return {
          id,
          type: "take_hands",
          beats: 0,
          cid: "partner",
          hand: "right",
        };
      case "turn_alone":
        return { id, type: "turn_alone", beats: 2 };
      case "turn_as_a_couple":
        return { id, type: "turn_as_a_couple", beats: 4 };
      case "zig_zag":
        return {
          id,
          type: "zig_zag",
          beats: 8,
          dir: "left",
          nZigs: 2,
        };
      case "bend_the_line":
        return { id, type: "bend_the_line", beats: 2 };
      case "down_the_hall":
      case "up_the_hall":
        return { id, type, beats: 6, distance: 1.5 };
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

function pureDirectionToText(dir: PureDirection): string {
  switch (dir) {
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
    default:
      assertNever(dir);
  }
}

function labelToIdentifierText(label: Label): string {
  switch (label) {
    case "partner":
      return "your partner";
    case "neighbor":
      return "your neighbor";
    case "shadow":
      return "your shadow";
    case "opposite":
      return "your opposite";
    case "next_neighbor":
      return "your next neighbor";
    case "next_x2_neighbor":
      return "your next x2 neighbor";
    case "next_x3_neighbor":
      return "your next x3 neighbor";
    case "prev_neighbor":
      return "your prev neighbor";
    case "prev_x2_neighbor":
      return "your prev x2 neighbor";
    case "prev_x3_neighbor":
      return "your prev x3 neighbor";
    case "shadow_2":
      return "your shadow 2";
    case "shadow_3":
      return "your shadow 3";
    case "shadow_4":
      return "your shadow 4";
    case "shadow_5":
      return "your shadow 5";
    case "shadow_6":
      return "your shadow 6";
    case "person_in_right_hand":
      return "the person in your right hand";
    case "person_in_left_hand":
      return "the person in your left hand";
    default:
      assertNever(label);
  }
}

function personInDirectionToText(dir: PureDirection): string {
  switch (dir) {
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
    default:
      assertNever(dir);
  }
}

export function calledDirectionToText(dir: CalledDirection): string {
  if (parses(PureDirectionSchema, dir)) return pureDirectionToText(dir);
  if (parses(TowardsLabelDirectionSchema, dir)) {
    const label = LabelSchema.parse(dir.slice("towards_".length));
    return `towards ${labelToIdentifierText(label)}`;
  }
  const pureDir = PureDirectionSchema.parse(
    dir.slice("towards_person_".length),
  );
  return `towards ${personInDirectionToText(pureDir)}`;
}

export function calledIdentifierToText(cid: CalledIdentifier): string {
  if (parses(PersonInDirectionSchema, cid)) {
    const pureDir = PureDirectionSchema.parse(cid.slice("person_".length));
    return personInDirectionToText(pureDir);
  }
  return labelToIdentifierText(LabelSchema.parse(cid));
}

export const DIR_OPTIONS = ["up", "down", "across", "out"] as const;

export const DROP_WHICH_OPTIONS = [
  "both",
  "left",
  "right",
  "partner",
  "shadow",
  "neighbor",
] as const;
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
