import type z from "zod";

import type { Role } from "../contraCore";
import {
  type CalledDirection,
  type CalledIdentifier,
  type CardinalDirection,
  InstructionIdSchema,
  labelId,
  personInDir,
  pureDir,
  type PureDirection,
} from "../instructions/_base";
import {
  type ActionOptionType,
  type Instruction,
  type InstructionId,
  InstructionSchema,
} from "../instructions/index";
import {
  allLLRRTemplates,
  allLRTemplates,
  LLRRTemplateIdSchema,
} from "../instructions/templates/index";
import { type Label } from "../labels";
import { assertNever, parses } from "../utils";

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
          cid: labelId("neighbor"),
          handedness: "right",
          rotations: 1,
        };
      case "balance":
        return { id, type: "balance", beats: 4, cid: labelId("partner") };
      case "balance_and_swing":
        return {
          id,
          type: "balance_and_swing",
          beats: 16,
          cid: labelId("partner"),
          endFacing: "across",
        };
      case "balance_the_ring":
        return { id, type: "balance_the_ring", beats: 4 };
      case "box_circulate":
        return { id, type: "box_circulate", beats: 4 };
      case "box_the_gnat":
        return { id, type: "box_the_gnat", beats: 4, cid: labelId("partner") };
      case "california_twirl":
        return { id, type: "california_twirl", beats: 4 };
      case "robins_chain":
        return { id, type: "robins_chain", beats: 8, cid: labelId("neighbor") };
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
          cid: labelId("neighbor"),
          rotations: 1,
        };
      case "drop_hands":
        return { id, type: "drop_hands", beats: 0, which: "both" };
      case "face":
        return { id, type: "face", beats: 0, direction: pureDir("across") };
      case "form_long_waves":
        return { id, type: "form_long_waves", beats: 0 };
      case "form_short_waves":
        return { id, type: "form_short_waves", beats: 0 };
      case "give_and_take_into_swing":
        return {
          id,
          type: "give_and_take_into_swing",
          beats: 16,
          cid: labelId("partner"),
          drawerRole: "lark",
          endFacing: "across",
        };
      case "hey":
        return {
          id,
          type: "hey",
          beats: 16,
          full: true,
          centerRole: "lark",
          centerHand: "right",
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
          cid: labelId("neighbor"),
          rotations: 1,
          whoInFront: "lark",
        };
      case "meltdown_swing":
        return {
          id,
          type: "meltdown_swing",
          beats: 16,
          cid: labelId("neighbor"),
          endFacing: "across",
        };
      case "pass_by":
        return {
          id,
          type: "pass_by",
          beats: 2,
          cid: labelId("neighbor"),
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
          cid: labelId("partner"),
          hand: "right",
        };
      case "greet_new_neighbors":
        return {
          id,
          type: "greet_new_neighbors",
          beats: 0,
          cid: personInDir("in_front", "different"),
        };
      case "greet_shadow":
        return {
          id,
          type: "greet_shadow",
          beats: 0,
          cid: personInDir("in_front", "different"),
          label: "shadow",
        };
      case "right_left_through":
        return { id, type: "right_left_through", beats: 8 };
      case "roll_away":
        return {
          id,
          type: "roll_away",
          roller: "lark",
          rollee: {
            type: "PersonInDirection",
            dir: "on_right",
            onlyRole: "different",
          },
          beats: 4,
        };
      case "rory_o_more":
        return { id, type: "rory_o_more", beats: 4, direction: "right" };
      case "slice":
        return { id, type: "slice", beats: 8, direction: "left" };
      case "shoulder_round":
        return {
          id,
          type: "shoulder_round",
          beats: 8,
          cid: labelId("partner"),
          handedness: "right",
          rotations: 1,
        };
      case "square_through":
        return {
          id,
          type: "square_through",
          beats: 8,
          nPullBys: 4,
          firstHand: "right",
          cid1: labelId("neighbor"),
          cid2: labelId("partner"),
        };
      case "single_file_promenade":
        return {
          id,
          type: "single_file_promenade",
          beats: 8,
          direction: "left",
          nPlaces: 4,
        };
      case "star":
        return {
          id,
          type: "star",
          beats: 8,
          direction: "left",
          nPlaces: 4,
        };
      case "split":
        return { id, type: "split", by: "role", larks: [], robins: [] };
      case "step":
        return {
          id,
          type: "step",
          beats: 1,
          direction: pureDir("in_front"),
          distance: 0,
          facing: pureDir("across"),
        };
      case "swing":
        return {
          id,
          type: "swing",
          beats: 16,
          cid: labelId("partner"),
          endFacing: "across",
        };
      case "take_hands_in_rings":
        return { id, type: "take_hands_in_rings", beats: 0 };
      case "take_hands":
        return {
          id,
          type: "take_hands",
          beats: 0,
          cid: labelId("partner"),
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
      default: {
        // Template IDs: create a templated_lr or templated_llrr instruction
        if (parses(LLRRTemplateIdSchema, type)) {
          const template = allLLRRTemplates[type];
          return {
            id,
            type: "templated_llrr",
            beats: template.defaultBeats,
            templateId: type,
            fields: {},
          };
        }
        const _exhaustive: keyof typeof allLRTemplates = type;
        const template = allLRTemplates[_exhaustive];
        return {
          id,
          type: "templated_lr",
          beats: template.defaultBeats,
          templateId: _exhaustive,
          fields: {},
        };
      }
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
    case "across":
      return "across";
    case "out":
      return "out";
    case "up":
      return "up";
    case "down":
      return "down";
    case "setclockwise":
      return "set clockwise";
    case "setcounterclockwise":
      return "set counterclockwise";
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
    case "next_opposite":
      return "your next opposite";
    case "next_x2_opposite":
      return "your next x2 opposite";
    case "next_x3_opposite":
      return "your next x3 opposite";
    case "prev_opposite":
      return "your prev opposite";
    case "prev_x2_opposite":
      return "your prev x2 opposite";
    case "prev_x3_opposite":
      return "your prev x3 opposite";
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
    case "across":
      return "the person across from you";
    case "out":
      return "the person out the set from you";
    case "up":
      return "the person above you";
    case "down":
      return "the person below you";
    case "setclockwise":
      return "the person set-clockwise from you";
    case "setcounterclockwise":
      return "the person set-counterclockwise from you";
    default:
      assertNever(dir);
  }
}

export function calledDirectionToText(dir: CalledDirection): string {
  switch (dir.type) {
    case "PureDirection":
      return pureDirectionToText(dir.dir);
    case "TowardsLabel":
      return `towards ${labelToIdentifierText(dir.label)}`;
    case "TowardsPerson":
      return `towards ${personInDirectionToText(dir.roughDir)}`;
    case "PerRole":
      return `(larks: ${calledDirectionToText(dir.larks)}, robins: ${calledDirectionToText(dir.robins)})`;
    case "PerProgDir":
      return `(ups: ${calledDirectionToText(dir.ups)}, downs: ${calledDirectionToText(dir.downs)})`;
    default:
      assertNever(dir);
  }
}

export function calledIdentifierToText(cid: CalledIdentifier): string {
  switch (cid.type) {
    case "label":
      return labelToIdentifierText(cid.label);
    case "PersonInDirection":
      return `${personInDirectionToText(cid.dir)} (${cid.onlyRole} role)`;
    case "PerRole":
      return `(larks: ${calledIdentifierToText(cid.larks)}, robins: ${calledIdentifierToText(cid.robins)})`;
    case "PerProgDir":
      return `(ups: ${calledIdentifierToText(cid.ups)}, downs: ${calledIdentifierToText(cid.downs)})`;
    default:
      assertNever(cid);
  }
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
