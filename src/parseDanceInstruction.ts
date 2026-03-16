/**
 * Parse freeform text descriptions of contra dance moves into Instruction objects.
 *
 * This is a best-effort parser for UI text input. It uses a chunk-based tokenizer
 * backed by an explicit keyword dictionary — the dictionary is exported so that
 * the autocomplete system can share it.
 */

import { makeDefaultInstruction } from "./components/fieldUtils";
import { type Role } from "./contraCore";
import { pureDir, type PureDirection } from "./directions";
import { type CalledIdentifier, labelId, personInDir } from "./identifiers";
import { AllemandeInstructionSchema } from "./instructions/allemande";
import { BalanceInstructionSchema } from "./instructions/balance";
import { BalanceAndSwingInstructionSchema } from "./instructions/balanceAndSwing";
import { BalanceTheRingInstructionSchema } from "./instructions/balanceTheRing";
import { BendTheLineInstructionSchema } from "./instructions/bendTheLine";
import { BoxCirculateInstructionSchema } from "./instructions/boxCirculate";
import { BoxTheGnatInstructionSchema } from "./instructions/boxTheGnat";
import { CaliforniaTwirlInstructionSchema } from "./instructions/californiaTwirl";
import { CircleInstructionSchema } from "./instructions/circle";
import { DoSiDoInstructionSchema } from "./instructions/doSiDo";
import { DownTheHallInstructionSchema } from "./instructions/downTheHall";
import { DropHandsInstructionSchema } from "./instructions/dropHands";
import { FaceInstructionSchema } from "./instructions/face";
import { FormLongWavesInstructionSchema } from "./instructions/formLongWaves";
import { FormShortWavesInstructionSchema } from "./instructions/formShortWaves";
import { GiveAndTakeIntoSwingInstructionSchema } from "./instructions/giveAndTakeIntoSwing";
import { GreetNewNeighborsInstructionSchema } from "./instructions/greetNewNeighbors";
import { GreetShadowInstructionSchema } from "./instructions/greetShadow";
import { HeyInstructionSchema } from "./instructions/hey";
import { type Instruction, InstructionSchema } from "./instructions/index";
import { type ActionOptionType } from "./instructions/index";
import { LongLineInCenterInstructionSchema } from "./instructions/longLineInCenter";
import { LongLinesForwardBackInstructionSchema } from "./instructions/longLinesForwardBack";
import { MadRobinInstructionSchema } from "./instructions/madRobin";
import { MeltdownSwingInstructionSchema } from "./instructions/meltdownSwing";
import { PassByInstructionSchema } from "./instructions/passBy";
import { PetronellaInstructionSchema } from "./instructions/petronella";
import { PoussetteInstructionSchema } from "./instructions/poussette";
import { PullByInstructionSchema } from "./instructions/pullBy";
import { RightLeftThroughInstructionSchema } from "./instructions/rightLeftThrough";
import { RobinsChainInstructionSchema } from "./instructions/robinsChain";
import { RollAwayInstructionSchema } from "./instructions/rollAway";
import { RoryOMoreInstructionSchema } from "./instructions/roryOMore";
import { ShoulderRoundInstructionSchema } from "./instructions/shoulderRound";
import { SingleFilePromenadeInstructionSchema } from "./instructions/singleFilePromenade";
import { SliceInstructionSchema } from "./instructions/slice";
import { SquareThroughInstructionSchema } from "./instructions/squareThrough";
import { StarInstructionSchema } from "./instructions/star";
import { StepInstructionSchema } from "./instructions/step";
import { SwingInstructionSchema } from "./instructions/swing";
import { TakeHandsInstructionSchema } from "./instructions/takeHands";
import { TakeHandsInRingsInstructionSchema } from "./instructions/takeHandsInRings";
import { TurnAloneInstructionSchema } from "./instructions/turnAlone";
import { TurnAsACoupleInstructionSchema } from "./instructions/turnAsACouple";
import { UpTheHallInstructionSchema } from "./instructions/upTheHall";
import { ZigZagInstructionSchema } from "./instructions/zigZag";
import {
  IrreducibleLabelSchema,
  type Label,
  ShadowLabelSchema,
} from "./labels";
import { assertNever, parses, typedParse } from "./utils";

// ── Keyword dictionary ──────────────────────────────────────────────────
//
// Each entry is either a plain-text keyword or a regex pattern for numeric
// values. Text entries are sorted longest-first at module load time so the
// tokenizer does greedy longest-match.

type TextKeywordEntry =
  | { text: string; chunk: "instruction_type"; value: ActionOptionType }
  | { text: string; chunk: "label"; value: Label }
  | { text: string; chunk: "direction_phrase"; value: PureDirection }
  | { text: string; chunk: "handedness"; value: "left" | "right" }
  | { text: string; chunk: "role"; value: Role }
  | { text: string; chunk: "n_places"; value: number }
  | { text: string; chunk: "n_rotations"; value: number }
  | { text: string; chunk: "keyword"; value: string };

type RegexKeywordEntry =
  | {
      pattern: RegExp;
      chunk: "beats";
      extract: (match: RegExpMatchArray) => number;
    }
  | {
      pattern: RegExp;
      chunk: "distance";
      extract: (match: RegExpMatchArray) => number;
    };

export type KeywordEntry = TextKeywordEntry | RegexKeywordEntry;

// ── Text keyword entries ─────────────────────────────────────────────────

const TEXT_KEYWORDS: TextKeywordEntry[] = [
  // Instruction types — multi-word phrases
  // "start a ... hey" is special: handled via regex, not text keyword
  {
    text: "balance and swing",
    chunk: "instruction_type",
    value: "balance_and_swing",
  },
  {
    text: "balance the ring",
    chunk: "instruction_type",
    value: "balance_the_ring",
  },
  { text: "box circulate", chunk: "instruction_type", value: "box_circulate" },
  { text: "box the gnat", chunk: "instruction_type", value: "box_the_gnat" },
  {
    text: "california twirl",
    chunk: "instruction_type",
    value: "california_twirl",
  },
  { text: "robins chain", chunk: "instruction_type", value: "robins_chain" },
  { text: "robin chain", chunk: "instruction_type", value: "robins_chain" },
  { text: "ladies chain", chunk: "instruction_type", value: "robins_chain" },
  { text: "lady chain", chunk: "instruction_type", value: "robins_chain" },
  {
    text: "right and left through",
    chunk: "instruction_type",
    value: "right_left_through",
  },
  {
    text: "right left through",
    chunk: "instruction_type",
    value: "right_left_through",
  },
  { text: "do si do", chunk: "instruction_type", value: "do_si_do" },
  { text: "do-si-do", chunk: "instruction_type", value: "do_si_do" },
  { text: "dosido", chunk: "instruction_type", value: "do_si_do" },
  {
    text: "give and take into swing",
    chunk: "instruction_type",
    value: "give_and_take_into_swing",
  },
  {
    text: "give and take swing",
    chunk: "instruction_type",
    value: "give_and_take_into_swing",
  },
  {
    text: "meltdown swing",
    chunk: "instruction_type",
    value: "meltdown_swing",
  },
  {
    text: "long lines forward and back",
    chunk: "instruction_type",
    value: "long_lines_forward_back",
  },
  {
    text: "long lines forward back",
    chunk: "instruction_type",
    value: "long_lines_forward_back",
  },
  {
    text: "long line forward and back",
    chunk: "instruction_type",
    value: "long_lines_forward_back",
  },
  {
    text: "long line forward back",
    chunk: "instruction_type",
    value: "long_lines_forward_back",
  },
  {
    text: "long line in the center",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "long line in the centre",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "long line in the middle",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "long line in center",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "long line in centre",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "long line in middle",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "form a long line in the center",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "form a long line in the centre",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "form a long line in the middle",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "form a long line in center",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "form long line in the center",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "form long line in the centre",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "form long line in center",
    chunk: "instruction_type",
    value: "long_line_in_center",
  },
  {
    text: "form a long wave",
    chunk: "instruction_type",
    value: "form_long_waves",
  },
  {
    text: "form a long line",
    chunk: "instruction_type",
    value: "form_long_waves",
  },
  {
    text: "form long wave",
    chunk: "instruction_type",
    value: "form_long_waves",
  },
  {
    text: "form long line",
    chunk: "instruction_type",
    value: "form_long_waves",
  },
  {
    text: "form a short wave",
    chunk: "instruction_type",
    value: "form_short_waves",
  },
  {
    text: "form short wave",
    chunk: "instruction_type",
    value: "form_short_waves",
  },
  {
    text: "take hands in a ring",
    chunk: "instruction_type",
    value: "take_hands_in_rings",
  },
  {
    text: "take hands in ring",
    chunk: "instruction_type",
    value: "take_hands_in_rings",
  },
  {
    text: "take hand in a ring",
    chunk: "instruction_type",
    value: "take_hands_in_rings",
  },
  {
    text: "take hand in ring",
    chunk: "instruction_type",
    value: "take_hands_in_rings",
  },
  {
    text: "turn as a couple",
    chunk: "instruction_type",
    value: "turn_as_a_couple",
  },
  { text: "turn alone", chunk: "instruction_type", value: "turn_alone" },
  {
    text: "single file promenade",
    chunk: "instruction_type",
    value: "single_file_promenade",
  },
  {
    text: "shoulder round",
    chunk: "instruction_type",
    value: "shoulder_round",
  },
  { text: "mad robin", chunk: "instruction_type", value: "mad_robin" },
  { text: "roll away", chunk: "instruction_type", value: "roll_away" },
  { text: "rory o more", chunk: "instruction_type", value: "rory_o_more" },
  { text: "rory o'more", chunk: "instruction_type", value: "rory_o_more" },
  { text: "rory o\u2019more", chunk: "instruction_type", value: "rory_o_more" },
  { text: "rory omore", chunk: "instruction_type", value: "rory_o_more" },
  {
    text: "square through",
    chunk: "instruction_type",
    value: "square_through",
  },
  { text: "bend the line", chunk: "instruction_type", value: "bend_the_line" },
  {
    text: "greet new neighbor",
    chunk: "instruction_type",
    value: "greet_new_neighbors",
  },
  {
    text: "greet neighbor",
    chunk: "instruction_type",
    value: "greet_new_neighbors",
  },
  { text: "greet shadow", chunk: "instruction_type", value: "greet_shadow" },
  { text: "down the hall", chunk: "instruction_type", value: "down_the_hall" },
  { text: "up the hall", chunk: "instruction_type", value: "up_the_hall" },
  { text: "pull by", chunk: "instruction_type", value: "pull_by" },
  { text: "pass by", chunk: "instruction_type", value: "pass_by" },
  { text: "drop hands", chunk: "instruction_type", value: "drop_hands" },
  { text: "take hands", chunk: "instruction_type", value: "take_hands" },
  { text: "zig zag", chunk: "instruction_type", value: "zig_zag" },
  { text: "zig-zag", chunk: "instruction_type", value: "zig_zag" },
  { text: "zigzag", chunk: "instruction_type", value: "zig_zag" },
  // Single-word instruction types
  { text: "step", chunk: "instruction_type", value: "step" },
  { text: "swing", chunk: "instruction_type", value: "swing" },
  { text: "allemande", chunk: "instruction_type", value: "allemande" },
  { text: "petronella", chunk: "instruction_type", value: "petronella" },
  { text: "circle", chunk: "instruction_type", value: "circle" },
  { text: "star", chunk: "instruction_type", value: "star" },
  { text: "hey", chunk: "instruction_type", value: "hey" },
  { text: "balance", chunk: "instruction_type", value: "balance" },
  { text: "poussette", chunk: "instruction_type", value: "poussette" },
  { text: "slice", chunk: "instruction_type", value: "slice" },
  { text: "face", chunk: "instruction_type", value: "face" },
  { text: "chain", chunk: "instruction_type", value: "robins_chain" },

  // Labels (longest first, include plural forms)
  { text: "previous neighbors", chunk: "label", value: "prev_neighbor" },
  { text: "previous neighbor", chunk: "label", value: "prev_neighbor" },
  { text: "prev neighbors", chunk: "label", value: "prev_neighbor" },
  { text: "prev neighbor", chunk: "label", value: "prev_neighbor" },
  { text: "next x2 neighbors", chunk: "label", value: "next_x2_neighbor" },
  { text: "next x2 neighbor", chunk: "label", value: "next_x2_neighbor" },
  { text: "3rd neighbors", chunk: "label", value: "next_x2_neighbor" },
  { text: "3rd neighbor", chunk: "label", value: "next_x2_neighbor" },
  { text: "next neighbors", chunk: "label", value: "next_neighbor" },
  { text: "next neighbor", chunk: "label", value: "next_neighbor" },
  { text: "2nd neighbors", chunk: "label", value: "next_neighbor" },
  { text: "2nd neighbor", chunk: "label", value: "next_neighbor" },
  { text: "1st neighbors", chunk: "label", value: "neighbor" },
  { text: "1st neighbor", chunk: "label", value: "neighbor" },
  { text: "partners", chunk: "label", value: "partner" },
  { text: "partner", chunk: "label", value: "partner" },
  { text: "neighbors", chunk: "label", value: "neighbor" },
  { text: "neighbor", chunk: "label", value: "neighbor" },
  { text: "shadow 2", chunk: "label", value: "shadow_2" },
  { text: "shadow 3", chunk: "label", value: "shadow_3" },
  { text: "shadow 4", chunk: "label", value: "shadow_4" },
  { text: "shadow", chunk: "label", value: "shadow" },
  { text: "opposite", chunk: "label", value: "opposite" },

  // Direction phrases (longest first)
  {
    text: "on the left diagonal",
    chunk: "direction_phrase",
    value: "left_diagonal",
  },
  {
    text: "on the right diagonal",
    chunk: "direction_phrase",
    value: "right_diagonal",
  },
  {
    text: "on left diagonal",
    chunk: "direction_phrase",
    value: "left_diagonal",
  },
  {
    text: "on right diagonal",
    chunk: "direction_phrase",
    value: "right_diagonal",
  },
  { text: "across the set", chunk: "direction_phrase", value: "across" },
  { text: "across", chunk: "direction_phrase", value: "across" },
  { text: "out", chunk: "direction_phrase", value: "out" },

  // Handedness
  { text: "left hand", chunk: "handedness", value: "left" },
  { text: "right hand", chunk: "handedness", value: "right" },

  // Roles
  { text: "gentlespoons", chunk: "role", value: "lark" },
  { text: "gentlespoon", chunk: "role", value: "lark" },
  { text: "larks", chunk: "role", value: "lark" },
  { text: "lark", chunk: "role", value: "lark" },
  { text: "gents", chunk: "role", value: "lark" },
  { text: "gent", chunk: "role", value: "lark" },
  { text: "robins", chunk: "role", value: "robin" },
  { text: "robin", chunk: "role", value: "robin" },
  { text: "ladles", chunk: "role", value: "robin" },
  { text: "ladle", chunk: "role", value: "robin" },
  { text: "ladies", chunk: "role", value: "robin" },
  { text: "lady", chunk: "role", value: "robin" },

  // Numbers of places for circles, stars, etc.
  { text: "2 places", chunk: "n_places", value: 2 },
  { text: "3 places", chunk: "n_places", value: 3 },
  { text: "4 places", chunk: "n_places", value: 4 },

  // Numbers of rotations for allemande, shoulder round, etc.
  { text: "1/2", chunk: "n_rotations", value: 1 / 2 },
  { text: "½", chunk: "n_rotations", value: 1 / 2 },
  { text: "3/4", chunk: "n_rotations", value: 3 / 4 },
  { text: "¾", chunk: "n_rotations", value: 3 / 4 },
  { text: "once", chunk: "n_rotations", value: 1 },
  { text: "1 1/4", chunk: "n_rotations", value: 1 + 1 / 4 },
  { text: "1¼", chunk: "n_rotations", value: 1 + 1 / 4 },
  { text: "1 1/2", chunk: "n_rotations", value: 1 + 1 / 2 },
  { text: "1½", chunk: "n_rotations", value: 1 + 1 / 2 },
  { text: "1 3/4", chunk: "n_rotations", value: 1 + 3 / 4 },
  { text: "1¾", chunk: "n_rotations", value: 1 + 3 / 4 },
  { text: "twice", chunk: "n_rotations", value: 2 },
  { text: "1 1/4", chunk: "n_rotations", value: 1 + 1 / 4 },
  { text: "1¼", chunk: "n_rotations", value: 1 + 1 / 4 },
  { text: "1 1/2", chunk: "n_rotations", value: 1 + 1 / 2 },
  { text: "1½", chunk: "n_rotations", value: 1 + 1 / 2 },
  { text: "1 3/4", chunk: "n_rotations", value: 1 + 3 / 4 },
  { text: "1¾", chunk: "n_rotations", value: 1 + 3 / 4 },

  // Other keywords
  { text: "lefts in the center", chunk: "keyword", value: "lefts_in_center" },
  { text: "lefts in the centre", chunk: "keyword", value: "lefts_in_center" },
  { text: "lefts in the middle", chunk: "keyword", value: "lefts_in_center" },
  { text: "lefts in center", chunk: "keyword", value: "lefts_in_center" },
  { text: "lefts in centre", chunk: "keyword", value: "lefts_in_center" },
  { text: "lefts in middle", chunk: "keyword", value: "lefts_in_center" },
  { text: "left in the center", chunk: "keyword", value: "lefts_in_center" },
  { text: "left in the centre", chunk: "keyword", value: "lefts_in_center" },
  { text: "left in center", chunk: "keyword", value: "lefts_in_center" },
  { text: "left in centre", chunk: "keyword", value: "lefts_in_center" },
  { text: "rights in the center", chunk: "keyword", value: "rights_in_center" },
  { text: "rights in the centre", chunk: "keyword", value: "rights_in_center" },
  { text: "rights in the middle", chunk: "keyword", value: "rights_in_center" },
  { text: "rights in center", chunk: "keyword", value: "rights_in_center" },
  { text: "rights in centre", chunk: "keyword", value: "rights_in_center" },
  { text: "rights in middle", chunk: "keyword", value: "rights_in_center" },
  { text: "right in the center", chunk: "keyword", value: "rights_in_center" },
  { text: "right in the centre", chunk: "keyword", value: "rights_in_center" },
  { text: "right in center", chunk: "keyword", value: "rights_in_center" },
  { text: "right in centre", chunk: "keyword", value: "rights_in_center" },
  { text: "once and a half", chunk: "keyword", value: "once_and_a_half" },
  { text: "twice and a half", chunk: "keyword", value: "twice_and_a_half" },
  { text: "start a", chunk: "keyword", value: "start_a" },
  { text: "end facing across", chunk: "keyword", value: "end_facing_across" },
  {
    text: "end facing down the hall",
    chunk: "keyword",
    value: "end_facing_down",
  },
  { text: "end facing up the hall", chunk: "keyword", value: "end_facing_up" },
  { text: "end facing out", chunk: "keyword", value: "end_facing_out" },
  { text: "backward", chunk: "keyword", value: "backward" },
  { text: "backwards", chunk: "keyword", value: "backward" },
  { text: "forward", chunk: "keyword", value: "forward" },
  { text: "while", chunk: "keyword", value: "while" },
  { text: "twice", chunk: "keyword", value: "twice" },
  { text: "once", chunk: "keyword", value: "once" },
  { text: "half", chunk: "keyword", value: "half" },
  { text: "full", chunk: "keyword", value: "full" },
  { text: "back", chunk: "keyword", value: "backward" },
  { text: "left", chunk: "keyword", value: "left" },
  { text: "right", chunk: "keyword", value: "right" },
];

// Sort text keywords longest-first for greedy matching
TEXT_KEYWORDS.sort((a, b) => b.text.length - a.text.length);

// ── Regex keyword entries (for numeric patterns) ─────────────────────────

const REGEX_KEYWORDS: RegexKeywordEntry[] = [
  {
    pattern: /^(\d+)\s*b(eats?)?\b/i,
    chunk: "beats",
    extract: (m) => Number(m[1]),
  },
  {
    pattern: /^([\d.]+)\s*m(?:eters?)?\b/i,
    chunk: "distance",
    extract: (m) => Number(m[1]),
  },
];

/** The full keyword dictionary, exported for use by autocomplete. */
export const KEYWORD_DICTIONARY: readonly KeywordEntry[] = [
  ...TEXT_KEYWORDS,
  ...REGEX_KEYWORDS,
];

// ── Autocomplete ────────────────────────────────────────────────────────

export interface Completion {
  /** The full keyword text that could be inserted. */
  keyword: string;
  /** How many characters of the keyword already match the input suffix. */
  overlap: number;
  /** The chunk type this keyword represents. */
  chunk: TextKeywordEntry["chunk"];
}

/**
 * Get autocomplete suggestions for the current input text.
 *
 * For each text keyword, checks if any nonempty prefix of the keyword equals
 * a suffix of the input (case-insensitive). Returns matches sorted by overlap
 * length descending (strongest matches first), deduplicated by keyword text.
 */
export function getCompletions(input: string): Completion[] {
  if (!input) return [];
  const lowerInput = input.toLowerCase();

  // Collect the best match per synonym group (keyed by chunk+value).
  // Within a group, prefer the match with the longest overlap.
  const bestByGroup = new Map<string, Completion>();

  for (const entry of TEXT_KEYWORDS) {
    if (!("text" in entry)) continue;
    const keyword = entry.text;
    const lowerKeyword = keyword.toLowerCase();

    // Find the longest prefix of the keyword that matches a suffix of the input.
    const maxCheck = Math.min(lowerKeyword.length, lowerInput.length);
    let bestOverlap = 0;
    for (let len = 1; len <= maxCheck; len++) {
      const inputSuffix = lowerInput.slice(-len);
      const keywordPrefix = lowerKeyword.slice(0, len);
      if (inputSuffix === keywordPrefix) {
        // Also check word boundary: the character before the suffix in input
        // should be a space or the suffix should be the entire input
        const posBeforeSuffix = lowerInput.length - len - 1;
        if (posBeforeSuffix < 0 || /\s/.test(lowerInput[posBeforeSuffix])) {
          bestOverlap = len;
        }
      }
    }

    if (bestOverlap > 0 && bestOverlap < lowerKeyword.length) {
      const groupKey = `${entry.chunk}\0${entry.value}`;
      const existing = bestByGroup.get(groupKey);
      if (!existing || bestOverlap > existing.overlap) {
        bestByGroup.set(groupKey, {
          keyword,
          overlap: bestOverlap,
          chunk: entry.chunk,
        });
      }
    }
  }

  const results = [...bestByGroup.values()];

  // Sort by overlap descending (strongest match first), then alphabetically
  results.sort(
    (a, b) => b.overlap - a.overlap || a.keyword.localeCompare(b.keyword),
  );

  return results;
}

// ── Tokenizer ───────────────────────────────────────────────────────────

export type Chunk =
  | { type: "instruction_type"; value: ActionOptionType; raw: string }
  | { type: "label"; value: Label; raw: string }
  | { type: "direction_phrase"; value: PureDirection; raw: string }
  | { type: "handedness"; value: "left" | "right"; raw: string }
  | { type: "role"; value: Role; raw: string }
  | { type: "keyword"; value: string; raw: string }
  | { type: "beats"; value: number; raw: string }
  | { type: "n_places"; value: number; raw: string }
  | { type: "n_rotations"; value: number; raw: string }
  | { type: "distance"; value: number; raw: string }
  | { type: "unparsed"; value: string; raw: string };

/**
 * Check if a character is a word character (letter, digit, or underscore).
 * Used for word-boundary checks during tokenization.
 */
function isWordChar(ch: string): boolean {
  return /\w/.test(ch);
}

/**
 * Tokenize input text into typed chunks using the keyword dictionary.
 *
 * Algorithm:
 * 1. Skip leading whitespace
 * 2. Try each text keyword (longest-first) at the current position, case-insensitive
 *    - Require word boundary at end of match (not in the middle of a longer word)
 * 3. Try each regex pattern (anchored at start of remaining text)
 * 4. If no match, consume one whitespace-delimited word as "unparsed"
 */
export function tokenize(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Skip leading whitespace and common filler
    const wsMatch = remaining.match(/^[\s,\-–—]+/);
    if (wsMatch) {
      remaining = remaining.slice(wsMatch[0].length);
      continue;
    }

    if (remaining.length === 0) break;

    let matched = false;

    // Try text keywords (already sorted longest-first)
    const lowerRemaining = remaining.toLowerCase();
    for (const entry of TEXT_KEYWORDS) {
      const len = entry.text.length;
      if (lowerRemaining.startsWith(entry.text)) {
        // Word boundary check: the character after the match (if any) must not be a word char
        const charAfter = remaining[len];
        if (charAfter !== undefined && isWordChar(charAfter)) continue;

        const raw = remaining.slice(0, len);
        chunks.push(makeChunkFromText(entry, raw));
        remaining = remaining.slice(len);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Try regex patterns
    for (const entry of REGEX_KEYWORDS) {
      const m = remaining.match(entry.pattern);
      if (m) {
        const raw = m[0];
        chunks.push(makeChunkFromRegex(entry, m));
        remaining = remaining.slice(raw.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // No match — consume one word as unparsed
    const wordMatch = remaining.match(/^\S+/);
    if (wordMatch) {
      chunks.push({
        type: "unparsed",
        value: wordMatch[0],
        raw: wordMatch[0],
      });
      remaining = remaining.slice(wordMatch[0].length);
    }
  }

  return chunks;
}

function makeChunkFromText(entry: TextKeywordEntry, raw: string): Chunk {
  switch (entry.chunk) {
    case "instruction_type":
      return { type: "instruction_type", value: entry.value, raw };
    case "label":
      return { type: "label", value: entry.value, raw };
    case "direction_phrase":
      return { type: "direction_phrase", value: entry.value, raw };
    case "handedness":
      return { type: "handedness", value: entry.value, raw };
    case "role":
      return { type: "role", value: entry.value, raw };
    case "n_places":
      return { type: "n_places", value: entry.value, raw };
    case "n_rotations":
      return { type: "n_rotations", value: entry.value, raw };
    case "keyword":
      return { type: "keyword", value: entry.value, raw };
  }
}

function makeChunkFromRegex(
  entry: RegexKeywordEntry,
  match: RegExpMatchArray,
): Chunk {
  const raw = match[0];
  switch (entry.chunk) {
    case "beats":
      return { type: "beats", value: entry.extract(match), raw };
    case "distance":
      return { type: "distance", value: entry.extract(match), raw };
  }
}

// ── Chunk interpretation ────────────────────────────────────────────────

/** Find the first chunk of a given type. */
function findChunk<T extends Chunk["type"]>(
  chunks: Chunk[],
  type: T,
): Extract<Chunk, { type: T }> | undefined {
  return chunks.find((c): c is Extract<Chunk, { type: T }> => c.type === type);
}

/** Check if any chunk has a given keyword value. */
function hasKeyword(chunks: Chunk[], value: string): boolean {
  return chunks.some((c) => c.type === "keyword" && c.value === value);
}

/**
 * Determine the CalledIdentifier from chunks, checking labels first,
 * then directional phrases.
 */
function cidFromChunks(chunks: Chunk[]): CalledIdentifier | undefined {
  const labelChunk = findChunk(chunks, "label");
  if (labelChunk) return labelId(labelChunk.value);
  const dirChunk = findChunk(chunks, "direction_phrase");
  if (dirChunk) return personInDir(dirChunk.value, "different");
  return undefined;
}

/**
 * Interpret tokenized chunks into an Instruction, given a detected type.
 * Creates a default instruction then applies overrides from the chunks.
 */
function interpretChunks(type: ActionOptionType, chunks: Chunk[]): Instruction {
  const overrides: Record<string, unknown> = {};

  const beatsChunk = findChunk(chunks, "beats");
  if (beatsChunk) overrides.beats = beatsChunk.value;

  switch (type) {
    case "swing":
      return typedParse(SwingInstructionSchema, {
        type: "swing",
        beats: findChunk(chunks, "beats")?.value ?? 16,
        cid: cidFromChunks(chunks) ?? labelId("partner"),
        endFacing: endFacingFromKeywords(chunks) ?? "across",
      });
    case "balance_and_swing":
      return typedParse(BalanceAndSwingInstructionSchema, {
        type: "balance_and_swing",
        beats: findChunk(chunks, "beats")?.value ?? 16,
        cid: cidFromChunks(chunks) ?? labelId("partner"),
        endFacing: endFacingFromKeywords(chunks) ?? "across",
      });
    case "meltdown_swing":
      return typedParse(MeltdownSwingInstructionSchema, {
        type: "meltdown_swing",
        beats: findChunk(chunks, "beats")?.value ?? 16,
        cid: cidFromChunks(chunks) ?? labelId("partner"),
        endFacing: endFacingFromKeywords(chunks) ?? "across",
      });
    case "give_and_take_into_swing":
      return typedParse(GiveAndTakeIntoSwingInstructionSchema, {
        type: "give_and_take_into_swing",
        beats: findChunk(chunks, "beats")?.value ?? 16,
        cid: cidFromChunks(chunks) ?? labelId("partner"),
        drawerRole: findChunk(chunks, "role")?.value ?? "lark",
        endFacing: endFacingFromKeywords(chunks) ?? "across",
      });

    case "allemande":
      return typedParse(AllemandeInstructionSchema, {
        type: "allemande",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        cid: cidFromChunks(chunks) ?? labelId("neighbor"),
        handedness: findChunk(chunks, "handedness")?.value ?? "right",
        rotations: findChunk(chunks, "n_rotations")?.value ?? 1,
      });
    case "shoulder_round":
      return typedParse(ShoulderRoundInstructionSchema, {
        type: "shoulder_round",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        cid: cidFromChunks(chunks) ?? labelId("neighbor"),
        handedness: findChunk(chunks, "handedness")?.value ?? "right",
        rotations: findChunk(chunks, "n_rotations")?.value ?? 1,
      });

    case "do_si_do":
      return typedParse(DoSiDoInstructionSchema, {
        type: "do_si_do",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        cid: cidFromChunks(chunks) ?? labelId("neighbor"),
        rotations: findChunk(chunks, "n_rotations")?.value ?? 1,
      });

    case "balance":
      return typedParse(BalanceInstructionSchema, {
        type: "balance",
        beats: findChunk(chunks, "beats")?.value ?? 4,
        cid: cidFromChunks(chunks) ?? labelId("partner"),
      });
    case "box_the_gnat":
      return typedParse(BoxTheGnatInstructionSchema, {
        type: "box_the_gnat",
        beats: findChunk(chunks, "beats")?.value ?? 4,
        cid: cidFromChunks(chunks) ?? labelId("partner"),
      });
    case "mad_robin":
      return typedParse(MadRobinInstructionSchema, {
        type: "mad_robin",
        beats: findChunk(chunks, "beats")?.value ?? 4,
        cid: cidFromChunks(chunks) ?? labelId("partner"),
        rotations: findChunk(chunks, "n_rotations")?.value ?? 1,
        whoInFront: findChunk(chunks, "role")?.value ?? "lark",
      });
    case "pass_by":
      return typedParse(PassByInstructionSchema, {
        type: "pass_by",
        beats: findChunk(chunks, "beats")?.value ?? 4,
        cid: cidFromChunks(chunks) ?? labelId("partner"),
        hand: findChunk(chunks, "handedness")?.value ?? "right",
      });
    case "pull_by":
      return typedParse(PullByInstructionSchema, {
        type: "pull_by",
        beats: findChunk(chunks, "beats")?.value ?? 4,
        cid: cidFromChunks(chunks) ?? labelId("partner"),
        hand: findChunk(chunks, "handedness")?.value ?? "right",
      });
    case "take_hands":
      return typedParse(TakeHandsInstructionSchema, {
        type: "take_hands",
        beats: 0,
        cid: cidFromChunks(chunks) ?? labelId("partner"),
        hand: findChunk(chunks, "handedness")?.value ?? "right",
      });
    case "rory_o_more":
      return typedParse(RoryOMoreInstructionSchema, {
        type: "rory_o_more",
        beats: findChunk(chunks, "beats")?.value ?? 4,
        direction: findChunk(chunks, "handedness")?.value ?? "right",
      });
    case "slice":
      return typedParse(SliceInstructionSchema, {
        type: "slice",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        direction: findChunk(chunks, "handedness")?.value ?? "left",
      });

    case "hey": {
      const isHalf = findChunk(chunks, "keyword")?.value === "half";
      return typedParse(HeyInstructionSchema, {
        type: "hey",
        beats: findChunk(chunks, "beats")?.value ?? (isHalf ? 8 : 16),
        disambiguatingCid: cidFromChunks(chunks),
        full: !isHalf,
        centerRole: findChunk(chunks, "role")?.value ?? "lark",
        centerHand: findChunk(chunks, "handedness")?.value ?? "right",
      });
    }

    case "step": {
      return typedParse(StepInstructionSchema, {
        type: "step",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        direction: pureDir(
          findChunk(chunks, "direction_phrase")?.value ?? "in_front",
        ),
        facing: pureDir("in_front"),
        distance: findChunk(chunks, "distance")?.value ?? 1,
      });
    }

    case "long_line_in_center": {
      return typedParse(LongLineInCenterInstructionSchema, {
        type: "long_line_in_center",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        role: findChunk(chunks, "role")?.value ?? "lark",
      });
    }

    case "face":
      return typedParse(FaceInstructionSchema, {
        type: "face",
        beats: 0,
        direction: pureDir(
          findChunk(chunks, "direction_phrase")?.value ?? "in_front",
        ),
      });

    case "right_left_through": {
      return typedParse(RightLeftThroughInstructionSchema, {
        type: "right_left_through",
        beats: findChunk(chunks, "beats")?.value ?? 8,
      });
    }

    case "balance_the_ring":
      return typedParse(BalanceTheRingInstructionSchema, {
        type: "balance_the_ring",
        beats: findChunk(chunks, "beats")?.value ?? 4,
      });
    case "box_circulate":
      return typedParse(BoxCirculateInstructionSchema, {
        type: "box_circulate",
        beats: findChunk(chunks, "beats")?.value ?? 4,
      });
    case "california_twirl":
      return typedParse(CaliforniaTwirlInstructionSchema, {
        type: "california_twirl",
        beats: findChunk(chunks, "beats")?.value ?? 4,
      });
    case "long_lines_forward_back":
      return typedParse(LongLinesForwardBackInstructionSchema, {
        type: "long_lines_forward_back",
        beats: findChunk(chunks, "beats")?.value ?? 8,
      });
    case "form_long_waves":
      return typedParse(FormLongWavesInstructionSchema, {
        type: "form_long_waves",
        beats: 0,
      });
    case "form_short_waves":
      return typedParse(FormShortWavesInstructionSchema, {
        type: "form_short_waves",
        beats: 0,
      });
    case "take_hands_in_rings":
      return typedParse(TakeHandsInRingsInstructionSchema, {
        type: "take_hands_in_rings",
        beats: 0,
      });
    case "turn_alone":
      return typedParse(TurnAloneInstructionSchema, {
        type: "turn_alone",
        beats: findChunk(chunks, "beats")?.value ?? 8,
      });
    case "turn_as_a_couple":
      return typedParse(TurnAsACoupleInstructionSchema, {
        type: "turn_as_a_couple",
        beats: findChunk(chunks, "beats")?.value ?? 8,
      });
    case "petronella":
      return typedParse(PetronellaInstructionSchema, {
        type: "petronella",
        beats: findChunk(chunks, "beats")?.value ?? 8,
      });
    case "bend_the_line":
      return typedParse(BendTheLineInstructionSchema, {
        type: "bend_the_line",
        beats: findChunk(chunks, "beats")?.value ?? 8,
      });
    case "drop_hands":
      return typedParse(DropHandsInstructionSchema, {
        type: "drop_hands",
        beats: 0,
        which: findChunk(chunks, "handedness")?.value ?? "both",
      });
    case "greet_new_neighbors":
      return typedParse(GreetNewNeighborsInstructionSchema, {
        type: "greet_new_neighbors",
        beats: 0,
        cid: {
          type: "PersonInDirection",
          dir: findChunk(chunks, "direction_phrase")?.value ?? "in_front",
          onlyRole: "different",
        },
      });
    case "greet_shadow": {
      const label = findChunk(chunks, "label")?.value;
      return typedParse(GreetShadowInstructionSchema, {
        type: "greet_shadow",
        beats: 0,
        label: parses(ShadowLabelSchema, label) ? label : "shadow",
        cid: {
          type: "PersonInDirection",
          dir: findChunk(chunks, "direction_phrase")?.value ?? "in_front",
          onlyRole: "different",
        },
      });
    }
    case "down_the_hall":
      return typedParse(DownTheHallInstructionSchema, {
        type: "down_the_hall",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        distance: findChunk(chunks, "distance")?.value ?? 1.5,
      });
    case "up_the_hall":
      return typedParse(UpTheHallInstructionSchema, {
        type: "up_the_hall",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        distance: findChunk(chunks, "distance")?.value ?? 1.5,
      });
    case "square_through":
      return typedParse(SquareThroughInstructionSchema, {
        type: "square_through",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        nPullBys: 2,
        firstHand: findChunk(chunks, "handedness")?.value ?? "right",
        cid1: cidFromChunks(chunks) ?? labelId("partner"),
        cid2: cidFromChunks(chunks) ?? labelId("partner"),
      });
    case "roll_away": {
      const rollee = cidFromChunks(chunks);
      return typedParse(RollAwayInstructionSchema, {
        type: "roll_away",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        roller: findChunk(chunks, "role")?.value ?? "lark",
        rollee:
          rollee?.type === "label" &&
          parses(IrreducibleLabelSchema, rollee.label)
            ? { type: "label", label: rollee.label }
            : rollee?.type === "PersonInDirection"
              ? {
                  type: "PersonInDirection",
                  dir: rollee.dir === "on_left" ? "on_left" : "on_right",
                  onlyRole: rollee.onlyRole,
                }
              : { type: "label", label: "partner" },
      });
    }
    case "poussette":
      return typedParse(PoussetteInstructionSchema, {
        type: "poussette",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        backer: findChunk(chunks, "role")?.value ?? "lark",
        backerDir: findChunk(chunks, "handedness")?.value ?? "left",
        full: findChunk(chunks, "keyword")?.value === "full",
      });
    case "zig_zag":
      return typedParse(ZigZagInstructionSchema, {
        type: "zig_zag",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        dir: findChunk(chunks, "handedness")?.value ?? "left",
        nZigs: 2,
      });
    case "circle":
      return typedParse(CircleInstructionSchema, {
        type: "circle",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        direction: findChunk(chunks, "handedness")?.value ?? "left",
        nPlaces: findChunk(chunks, "n_places")?.value ?? 1,
        disambiguatingCid: cidFromChunks(chunks),
      });
    case "star":
      return typedParse(StarInstructionSchema, {
        type: "star",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        direction: findChunk(chunks, "handedness")?.value ?? "left",
        nPlaces: findChunk(chunks, "n_places")?.value ?? 1,
        disambiguatingCid: cidFromChunks(chunks),
      });
    case "single_file_promenade":
      return typedParse(SingleFilePromenadeInstructionSchema, {
        type: "single_file_promenade",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        direction: findChunk(chunks, "handedness")?.value ?? "left",
        nPlaces: findChunk(chunks, "n_places")?.value ?? 1,
        disambiguatingCid: cidFromChunks(chunks),
      });
    case "split":
      throw new Error("split is not supported");
    case "robins_chain":
      return typedParse(RobinsChainInstructionSchema, {
        type: "robins_chain",
        beats: findChunk(chunks, "beats")?.value ?? 8,
        cid: cidFromChunks(chunks) ?? labelId("partner"),
      });
    default:
      assertNever(type);
  }
}

/** Derive end-facing direction from "end facing ..." keywords. */
function endFacingFromKeywords(
  chunks: Chunk[],
): "across" | "down" | "up" | "out" | undefined {
  if (hasKeyword(chunks, "end_facing_across")) return "across";
  if (hasKeyword(chunks, "end_facing_down")) return "down";
  if (hasKeyword(chunks, "end_facing_up")) return "up";
  if (hasKeyword(chunks, "end_facing_out")) return "out";
  return undefined;
}

// ── Structural helpers ──────────────────────────────────────────────────

/** Find the instruction type from chunks. Also handles "start a ... hey" pattern. */
function detectTypeFromChunks(chunks: Chunk[]): ActionOptionType | undefined {
  // Special case: "start a ... hey" → hey (with centerRole from leading role)
  if (
    hasKeyword(chunks, "start_a") &&
    chunks.some((c) => c.type === "instruction_type" && c.value === "hey")
  ) {
    return "hey";
  }

  const typeChunk = findChunk(chunks, "instruction_type");
  return typeChunk?.value ?? undefined;
}

/** Check if a leading role is part of the figure name, not a split indicator. */
function roleIsPartOfName(type: ActionOptionType, chunks: Chunk[]): boolean {
  if (type === "robins_chain") return true;
  // "larks start a half hey" — the role describes who starts, not a split
  if (type === "hey" && hasKeyword(chunks, "start_a")) return true;
  return false;
}

/** Get the leading role from chunks (first chunk must be a role). */
function leadingRole(chunks: Chunk[]): Role | undefined {
  const firstSignificant = chunks.find((c) => c.type !== "unparsed");
  if (firstSignificant?.type === "role") return firstSignificant.value;
  return undefined;
}

// ── Main parser ─────────────────────────────────────────────────────────

/**
 * Parse a freeform text description of a contra dance instruction.
 *
 * Returns an array of Instructions (usually one, but sometimes more
 * if the text implies multiple steps, e.g. "while" splits).
 *
 * Returns an empty array if the text can't be parsed at all.
 */
export function parseDanceInstruction(text: string): Instruction[] {
  // Normalize "&" → "and" so ContraDB-style text like "balance & swing" works.
  let normalized = text.trim().replace(/&/g, "and");
  if (!normalized) return [];

  // Trailing ⁋ means "the person in front of you is your new neighbor"
  const hasProgression = normalized.endsWith("⁋");
  if (hasProgression) normalized = normalized.slice(0, -1).trim();

  // Split on commas to handle compound figures like "give and take, neighbors swing"
  const clauses = normalized
    .split(/,/)
    .map((s) => s.trim())
    .filter(Boolean);

  const results: Instruction[] = [];
  for (const clause of clauses) {
    results.push(...parseClause(clause));
  }

  if (hasProgression) {
    results.push(makeDefaultInstruction("greet_new_neighbors"));
  }

  return results;
}

/** Parse a single comma-separated clause (which may itself be a split). */
function parseClause(trimmed: string): Instruction[] {
  // Check for "while" splits first
  const whileParts = splitOnWhile(trimmed);
  if (whileParts) {
    return parseSplit(whileParts[0], whileParts[1]);
  }

  const chunks = tokenize(trimmed);
  const detectedType = detectTypeFromChunks(chunks);

  // Check if a leading role implies a split (e.g. "larks allemande left 1½")
  const role = leadingRole(chunks);

  if (role && detectedType && !roleIsPartOfName(detectedType, chunks)) {
    // This is a role-specific instruction → wrap in a split
    const innerInstr = interpretChunks(detectedType, chunks);
    const splitInstr = InstructionSchema.parse({
      type: "split",
      by: "role",
      larks: role === "lark" ? [innerInstr] : [],
      robins: role === "robin" ? [innerInstr] : [],
    });
    return [splitInstr];
  }

  if (!detectedType) return [];
  return [interpretChunks(detectedType, chunks)];
}

function parseSplit(part1: string, part2: string): Instruction[] {
  const chunks1 = tokenize(part1);
  const chunks2 = tokenize(part2);

  const type1 = detectTypeFromChunks(chunks1);
  const type2 = detectTypeFromChunks(chunks2);

  const role1 = leadingRole(chunks1);
  const role2 = leadingRole(chunks2);

  const instrs1 = type1 ? [interpretChunks(type1, chunks1)] : [];
  const instrs2 = type2 ? [interpretChunks(type2, chunks2)] : [];

  if (instrs1.length === 0 && instrs2.length === 0) return [];

  // Determine split axis
  if (
    (role1 === "lark" && role2 === "robin") ||
    (role1 === "robin" && role2 === "lark")
  ) {
    const splitInstr = InstructionSchema.parse({
      type: "split",
      by: "role",
      larks: role1 === "lark" ? instrs1 : instrs2,
      robins: role1 === "robin" ? instrs1 : instrs2,
    });
    return [splitInstr];
  }

  // Fallback: assume role split with part1 = larks, part2 = robins
  const splitInstr = InstructionSchema.parse({
    type: "split",
    by: "role",
    larks: instrs1,
    robins: instrs2,
  });
  return [splitInstr];
}

function splitOnWhile(text: string): [string, string] | undefined {
  const match = text.match(/^(.+?)\s+while\s+(.+)$/i);
  if (!match) return undefined;
  return [match[1], match[2]];
}
