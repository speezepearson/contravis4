/**
 * Parse freeform text descriptions of contra dance moves into Instruction objects.
 *
 * This is a best-effort parser for UI text input. It uses a chunk-based tokenizer
 * backed by an explicit keyword dictionary — the dictionary is exported so that
 * the autocomplete system can share it.
 */

import {
  makeDefaultInstruction,
  makeInstructionId,
} from "./components/fieldUtils";
import { type Role } from "./contraCore";
import { type PureDirection } from "./directions";
import { type CalledIdentifier, labelId, personInDir } from "./identifiers";
import { type Instruction, InstructionSchema } from "./instructions/index";
import { type ActionOptionType } from "./instructions/index";
import { type Label } from "./labels";

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
  | { text: string; chunk: "keyword"; value: string };

type RegexKeywordEntry =
  | {
      pattern: RegExp;
      chunk: "beats";
      extract: (match: RegExpMatchArray) => number;
    }
  | {
      pattern: RegExp;
      chunk: "rotations";
      extract: (match: RegExpMatchArray) => number;
    }
  | {
      pattern: RegExp;
      chunk: "n_places";
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
    pattern: /^(\d+)\s*beats?\b/i,
    chunk: "beats",
    extract: (m) => Number(m[1]),
  },
  {
    pattern: /^(\d+)\s*places?\b/i,
    chunk: "n_places",
    extract: (m) => Number(m[1]),
  },
  {
    pattern: /^(\d+(?:\.\d+)?)\s*(?:times?|rotations?)\b/i,
    chunk: "rotations",
    extract: (m) => Number(m[1]),
  },
  {
    pattern: /^([\d.]+)\s*m(?:eters?)?\b/i,
    chunk: "distance",
    extract: (m) => Number(m[1]),
  },
  { pattern: /^[¾]/, chunk: "n_places", extract: () => 3 },
  { pattern: /^1[½]/, chunk: "rotations", extract: () => 1.5 },
  { pattern: /^2[½]/, chunk: "rotations", extract: () => 2.5 },
  { pattern: /^[½]/, chunk: "rotations", extract: () => 0.5 },
  { pattern: /^1\s*1\/2/, chunk: "rotations", extract: () => 1.5 },
  { pattern: /^2\s*1\/2/, chunk: "rotations", extract: () => 2.5 },
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
  | { type: "rotations"; value: number; raw: string }
  | { type: "n_places"; value: number; raw: string }
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
    case "rotations":
      return { type: "rotations", value: entry.extract(match), raw };
    case "n_places":
      return { type: "n_places", value: entry.extract(match), raw };
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
function cidFromChunks(chunks: Chunk[]): CalledIdentifier | null {
  const labelChunk = findChunk(chunks, "label");
  if (labelChunk) return labelId(labelChunk.value);
  const dirChunk = findChunk(chunks, "direction_phrase");
  if (dirChunk) return personInDir(dirChunk.value, "different");
  return null;
}

/**
 * Interpret tokenized chunks into an Instruction, given a detected type.
 * Creates a default instruction then applies overrides from the chunks.
 */
function interpretChunks(type: ActionOptionType, chunks: Chunk[]): Instruction {
  const id = makeInstructionId();
  const base = makeDefaultInstruction(type, id);

  const overrides: Record<string, unknown> = {};

  const beatsChunk = findChunk(chunks, "beats");
  if (beatsChunk) overrides.beats = beatsChunk.value;

  const cid = cidFromChunks(chunks);
  const handednessChunk = findChunk(chunks, "handedness");
  const handedness =
    handednessChunk?.value ?? findHandednessFromKeywords(chunks);
  const rotationsChunk = findChunk(chunks, "rotations");
  const rotations = rotationsChunk?.value ?? rotationsFromKeywords(chunks);
  const nPlacesChunk = findChunk(chunks, "n_places");
  const direction = directionFromChunksOrKeywords(chunks);

  switch (base.type) {
    case "swing":
    case "balance_and_swing":
    case "meltdown_swing":
      if (cid) overrides.cid = cid;
      break;

    case "allemande":
    case "shoulder_round":
      if (cid) overrides.cid = cid;
      if (handedness) overrides.handedness = handedness;
      if (rotations !== null) overrides.rotations = rotations;
      break;

    case "do_si_do":
      if (cid) overrides.cid = cid;
      if (rotations !== null) overrides.rotations = rotations;
      break;

    case "balance":
    case "box_the_gnat":
    case "mad_robin":
    case "pass_by":
    case "pull_by":
    case "take_hands":
      if (cid) overrides.cid = cid;
      if ("hand" in base && handedness) overrides.hand = handedness;
      break;

    case "robins_chain":
      if (cid) overrides.cid = cid;
      break;

    case "circle":
    case "star":
    case "single_file_promenade":
      if (direction) overrides.direction = direction;
      if (nPlacesChunk) overrides.nPlaces = nPlacesChunk.value;
      break;

    case "rory_o_more":
    case "slice":
      if (direction) overrides.direction = direction;
      break;

    case "hey": {
      if (hasKeyword(chunks, "half")) overrides.full = false;
      if (hasKeyword(chunks, "full")) overrides.full = true;
      // Role at start → centerRole (e.g. "larks start a half hey")
      const roleChunk = findChunk(chunks, "role");
      if (roleChunk) overrides.centerRole = roleChunk.value;
      if (hasKeyword(chunks, "lefts_in_center")) overrides.centerHand = "left";
      if (hasKeyword(chunks, "rights_in_center"))
        overrides.centerHand = "right";
      break;
    }

    case "step":
      if (hasKeyword(chunks, "backward")) {
        overrides.direction = { type: "PureDirection", dir: "behind" };
      } else if (hasKeyword(chunks, "forward")) {
        overrides.direction = { type: "PureDirection", dir: "in_front" };
      }
      {
        const distChunk = findChunk(chunks, "distance");
        if (distChunk) overrides.distance = distChunk.value;
      }
      break;

    case "long_line_in_center": {
      // Look for role mention (not necessarily leading)
      const roleChunk = findChunk(chunks, "role");
      if (roleChunk) overrides.role = roleChunk.value;
      break;
    }

    // Types with no extra fields to override
    case "balance_the_ring":
    case "box_circulate":
    case "california_twirl":
    case "right_left_through":
    case "long_lines_forward_back":
    case "form_long_waves":
    case "form_short_waves":
    case "take_hands_in_rings":
    case "turn_alone":
    case "turn_as_a_couple":
    case "petronella":
    case "bend_the_line":
    case "drop_hands":
    case "face":
    case "greet_new_neighbors":
    case "greet_shadow":
    case "down_the_hall":
    case "up_the_hall":
    case "square_through":
    case "roll_away":
    case "give_and_take_into_swing":
    case "poussette":
    case "zig_zag":
    case "split":
    case "templated_lr":
    case "templated_llrr":
      break;
  }

  if (Object.keys(overrides).length === 0) return base;
  return InstructionSchema.parse({ ...base, ...overrides });
}

/**
 * Derive handedness from bare "left"/"right" keyword chunks
 * (when no explicit "left hand"/"right hand" was tokenized).
 */
function findHandednessFromKeywords(chunks: Chunk[]): "left" | "right" | null {
  if (hasKeyword(chunks, "left")) return "left";
  if (hasKeyword(chunks, "right")) return "right";
  return null;
}

/** Derive rotations from keyword chunks like "once", "twice", etc. */
function rotationsFromKeywords(chunks: Chunk[]): number | null {
  if (hasKeyword(chunks, "once_and_a_half")) return 1.5;
  if (hasKeyword(chunks, "twice_and_a_half")) return 2.5;
  if (hasKeyword(chunks, "twice")) return 2;
  if (hasKeyword(chunks, "once")) return 1;
  return null;
}

/** Derive left/right direction from keywords. */
function directionFromChunksOrKeywords(
  chunks: Chunk[],
): "left" | "right" | null {
  if (hasKeyword(chunks, "left")) return "left";
  if (hasKeyword(chunks, "right")) return "right";
  return null;
}

// ── Structural helpers ──────────────────────────────────────────────────

/** Find the instruction type from chunks. Also handles "start a ... hey" pattern. */
function detectTypeFromChunks(chunks: Chunk[]): ActionOptionType | null {
  // Special case: "start a ... hey" → hey (with centerRole from leading role)
  if (
    hasKeyword(chunks, "start_a") &&
    chunks.some((c) => c.type === "instruction_type" && c.value === "hey")
  ) {
    return "hey";
  }

  const typeChunk = findChunk(chunks, "instruction_type");
  return typeChunk?.value ?? null;
}

/** Check if a leading role is part of the figure name, not a split indicator. */
function roleIsPartOfName(type: ActionOptionType, chunks: Chunk[]): boolean {
  if (type === "robins_chain") return true;
  // "larks start a half hey" — the role describes who starts, not a split
  if (type === "hey" && hasKeyword(chunks, "start_a")) return true;
  return false;
}

/** Get the leading role from chunks (first chunk must be a role). */
function leadingRole(chunks: Chunk[]): Role | null {
  const firstSignificant = chunks.find((c) => c.type !== "unparsed");
  if (firstSignificant?.type === "role") return firstSignificant.value;
  return null;
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
    results.push(
      makeDefaultInstruction("greet_new_neighbors", makeInstructionId()),
    );
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
      id: makeInstructionId(),
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
      id: makeInstructionId(),
      type: "split",
      by: "role",
      larks: role1 === "lark" ? instrs1 : instrs2,
      robins: role1 === "robin" ? instrs1 : instrs2,
    });
    return [splitInstr];
  }

  // Fallback: assume role split with part1 = larks, part2 = robins
  const splitInstr = InstructionSchema.parse({
    id: makeInstructionId(),
    type: "split",
    by: "role",
    larks: instrs1,
    robins: instrs2,
  });
  return [splitInstr];
}

function splitOnWhile(text: string): [string, string] | null {
  const match = text.match(/^(.+?)\s+while\s+(.+)$/i);
  if (!match) return null;
  return [match[1], match[2]];
}
