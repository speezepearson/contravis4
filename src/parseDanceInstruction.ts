/**
 * Parse freeform text descriptions of contra dance moves into Instruction objects.
 *
 * This is a best-effort parser for UI text input. It uses keyword matching
 * rather than NLP — the goal is to be easily interpretable and produce
 * results that are understandable in retrospect, not to be perfect.
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

// ── Type detection ──────────────────────────────────────────────────────

/** Ordered list of patterns to match instruction types. Earlier entries win. */
const TYPE_PATTERNS: { pattern: RegExp; type: ActionOptionType }[] = [
  // Multi-word phrases first (order matters!)
  // "larks start a half hey" — role is part of the figure, not a split indicator
  { pattern: /start\s+a\s+.*hey\b/i, type: "hey" },
  { pattern: /balance\s+and\s+swing/i, type: "balance_and_swing" },
  { pattern: /balance\s+the\s+ring/i, type: "balance_the_ring" },
  { pattern: /box\s+circulate/i, type: "box_circulate" },
  { pattern: /box\s+the\s+gnat/i, type: "box_the_gnat" },
  { pattern: /california\s+twirl/i, type: "california_twirl" },
  { pattern: /robins?\s+chain/i, type: "robins_chain" },
  { pattern: /ladies?\s+chain/i, type: "robins_chain" },
  { pattern: /right\s+(?:and\s+)?left\s+through/i, type: "right_left_through" },
  { pattern: /do[-\s]?si[-\s]?do/i, type: "do_si_do" },
  {
    pattern: /give\s+and\s+take\s+(?:into\s+)?swing/i,
    type: "give_and_take_into_swing",
  },
  { pattern: /meltdown\s+swing/i, type: "meltdown_swing" },
  {
    pattern: /long\s+lines?\s+forward\s+(?:and\s+)?back/i,
    type: "long_lines_forward_back",
  },
  {
    pattern: /long\s+line\s+in\s+(?:the\s+)?(?:center|centre|middle)/i,
    type: "long_line_in_center",
  },
  { pattern: /form\s+(?:a\s+)?long\s+(?:line|wave)/i, type: "form_long_waves" },
  { pattern: /form\s+(?:a\s+)?short\s+wave/i, type: "form_short_waves" },
  {
    pattern: /take\s+hands?\s+in\s+(?:a\s+)?ring/i,
    type: "take_hands_in_rings",
  },
  { pattern: /turn\s+as\s+a\s+couple/i, type: "turn_as_a_couple" },
  { pattern: /turn\s+alone/i, type: "turn_alone" },
  { pattern: /single\s+file\s+promenade/i, type: "single_file_promenade" },
  { pattern: /shoulder\s+round/i, type: "shoulder_round" },
  { pattern: /mad\s+robin/i, type: "mad_robin" },
  { pattern: /roll\s+away/i, type: "roll_away" },
  { pattern: /rory\s+o['']?\s*more/i, type: "rory_o_more" },
  { pattern: /square\s+through/i, type: "square_through" },
  { pattern: /bend\s+the\s+line/i, type: "bend_the_line" },
  { pattern: /greet\s+(?:new\s+)?neighbor/i, type: "greet_new_neighbors" },
  { pattern: /greet\s+shadow/i, type: "greet_shadow" },
  { pattern: /down\s+the\s+hall/i, type: "down_the_hall" },
  { pattern: /up\s+the\s+hall/i, type: "up_the_hall" },
  { pattern: /pull\s+by/i, type: "pull_by" },
  { pattern: /pass\s+by/i, type: "pass_by" },
  { pattern: /drop\s+hands/i, type: "drop_hands" },
  { pattern: /take\s+hands/i, type: "take_hands" },
  { pattern: /zig\s*-?\s*zag/i, type: "zig_zag" },
  // Single-word patterns last
  { pattern: /\bstep\b/i, type: "step" },
  { pattern: /swing/i, type: "swing" },
  { pattern: /allemande/i, type: "allemande" },
  { pattern: /petronella/i, type: "petronella" },
  { pattern: /circle/i, type: "circle" },
  { pattern: /star\b/i, type: "star" },
  { pattern: /hey\b/i, type: "hey" },
  { pattern: /balance/i, type: "balance" },
  { pattern: /poussette/i, type: "poussette" },
  { pattern: /slice/i, type: "slice" },
  { pattern: /chain/i, type: "robins_chain" },
];

function detectType(text: string): ActionOptionType | null {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return null;
}

// ── Who detection (CalledIdentifier) ────────────────────────────────────

const LABEL_PATTERNS: { pattern: RegExp; label: Label }[] = [
  { pattern: /\bprev(?:ious)?\s+(?:x2\s+)?neighbor/i, label: "prev_neighbor" },
  { pattern: /\bnext\s+(?:x2\s+)?neighbor/i, label: "next_neighbor" },
  { pattern: /\bpartner/i, label: "partner" },
  { pattern: /\bneighbor/i, label: "neighbor" },
  { pattern: /\bshadow/i, label: "shadow" },
  { pattern: /\bopposite/i, label: "opposite" },
];

const DIRECTION_PHRASES: { pattern: RegExp; dir: PureDirection }[] = [
  { pattern: /\bon\s+(?:the\s+)?left\s+diagonal/i, dir: "left_diagonal" },
  { pattern: /\bon\s+(?:the\s+)?right\s+diagonal/i, dir: "right_diagonal" },
  { pattern: /\bacross(?:\s+the\s+set)?/i, dir: "across" },
];

function parseCid(text: string): CalledIdentifier | null {
  // Check label-based identifiers first
  for (const { pattern, label } of LABEL_PATTERNS) {
    if (pattern.test(text)) return labelId(label);
  }
  // Check directional identifiers
  for (const { pattern, dir } of DIRECTION_PHRASES) {
    if (pattern.test(text)) return personInDir(dir, "different");
  }
  return null;
}

// ── Modifier extraction ─────────────────────────────────────────────────

function parseBeats(text: string): number | null {
  const match = text.match(/(\d+)\s*beats?\b/i);
  return match ? Number(match[1]) : null;
}

function parseHandedness(text: string): "left" | "right" | null {
  // Look for "left hand" / "right hand" or standalone "left" / "right"
  // but be careful not to confuse with directional uses
  if (/\bleft\s+hand/i.test(text) || /\bleft\b/i.test(text)) return "left";
  if (/\bright\s+hand/i.test(text) || /\bright\b/i.test(text)) return "right";
  return null;
}

function parseRotations(text: string): number | null {
  // "1½" or "1 1/2" or "1.5" or "once and a half"
  if (/1[½]|1\s*1\/2|1\.5|once\s+and\s+a\s+half/i.test(text)) return 1.5;
  if (/[2½]|2\s*1\/2|2\.5|twice\s+and\s+a\s+half/i.test(text)) return 2.5;
  if (/\btwice\b/i.test(text)) return 2;
  if (/\bonce\b/i.test(text)) return 1;
  // Numeric: "2 times", "3 places", bare number before "time(s)"
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:times?|rotations?)/i);
  if (match) return Number(match[1]);
  return null;
}

function parseNPlaces(text: string): number | null {
  const match = text.match(/(\d+)\s*places?\b/i);
  if (match) return Number(match[1]);
  // Fractions: ¾ → 3 places, etc.
  if (/[¾]|3\/4/i.test(text)) return 3;
  return null;
}

function parseDirection(text: string): "left" | "right" | null {
  if (/\bleft\b/i.test(text)) return "left";
  if (/\bright\b/i.test(text)) return "right";
  return null;
}

// ── Role detection (for splits) ─────────────────────────────────────────

function parseLeadingRole(text: string): Role | null {
  // Detect if the text starts with a role name (indicating a role-specific instruction)
  if (/^\s*(?:larks?|gentlespoons?|gents?)\b/i.test(text)) return "lark";
  if (/^\s*(?:robins?|ladles?|ladies?)\b/i.test(text)) return "robin";
  return null;
}

/** Check if a leading role name is part of the figure name, not a split indicator. */
function roleIsPartOfName(type: ActionOptionType, text: string): boolean {
  if (type === "robins_chain") return true;
  // "larks start a half hey" — the role describes who starts, not a split
  if (type === "hey" && /start\s+a\s+/i.test(text)) return true;
  return false;
}

// ── Split detection ─────────────────────────────────────────────────────

function splitOnWhile(text: string): [string, string] | null {
  const match = text.match(/^(.+?)\s+while\s+(.+)$/i);
  if (!match) return null;
  return [match[1], match[2]];
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

  // Check if a leading role implies a split (e.g. "larks allemande left 1½")
  const leadingRole = parseLeadingRole(trimmed);
  const detectedType = detectType(trimmed);

  if (leadingRole && detectedType && !roleIsPartOfName(detectedType, trimmed)) {
    // This is a role-specific instruction → wrap in a split
    const innerInstrs = parseSingleInstruction(trimmed);
    if (innerInstrs.length > 0) {
      const splitInstr = InstructionSchema.parse({
        id: makeInstructionId(),
        type: "split",
        by: "role",
        larks: leadingRole === "lark" ? innerInstrs : [],
        robins: leadingRole === "robin" ? innerInstrs : [],
      });
      return [splitInstr];
    }
  }

  return parseSingleInstruction(trimmed);
}

function parseSplit(part1: string, part2: string): Instruction[] {
  const role1 = parseLeadingRole(part1);
  const role2 = parseLeadingRole(part2);

  const instrs1 = parseSingleInstruction(part1);
  const instrs2 = parseSingleInstruction(part2);

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

function parseSingleInstruction(text: string): Instruction[] {
  const type = detectType(text);
  if (!type) return [];

  const id = makeInstructionId();
  const base = makeDefaultInstruction(type, id);

  // Apply overrides from text
  return [applyOverrides(base, text)];
}

/**
 * Starting from a default instruction, override fields based on what
 * we can extract from the text.
 */
function applyOverrides(instr: Instruction, text: string): Instruction {
  const beats = parseBeats(text);
  const cid = parseCid(text);
  const handedness = parseHandedness(text);
  const rotations = parseRotations(text);
  const nPlaces = parseNPlaces(text);
  const direction = parseDirection(text);

  // Build an override object based on what we parsed and what fields the
  // instruction type actually has.
  const overrides: Record<string, unknown> = {};

  if (beats !== null) {
    overrides.beats = beats;
  }

  switch (instr.type) {
    case "swing":
    case "balance_and_swing":
    case "meltdown_swing":
      if (cid) overrides.cid = cid;
      break;

    case "allemande":
    case "shoulder_round":
      if (cid) overrides.cid = cid;
      if (handedness) overrides.handedness = handedness;
      if (rotations) overrides.rotations = rotations;
      break;

    case "do_si_do":
      if (cid) overrides.cid = cid;
      if (rotations) overrides.rotations = rotations;
      break;

    case "balance":
    case "box_the_gnat":
    case "mad_robin":
    case "pass_by":
    case "pull_by":
    case "take_hands":
      if (cid) overrides.cid = cid;
      if ("hand" in instr && handedness) overrides.hand = handedness;
      break;

    case "robins_chain":
      if (cid) overrides.cid = cid;
      break;

    case "circle":
    case "star":
    case "single_file_promenade":
      if (direction) overrides.direction = direction;
      if (nPlaces) overrides.nPlaces = nPlaces;
      break;

    case "rory_o_more":
    case "slice":
      if (direction) overrides.direction = direction;
      break;

    case "hey": {
      if (/\bhalf\b/i.test(text)) overrides.full = false;
      if (/\bfull\b/i.test(text)) overrides.full = true;
      // "larks start a half hey - lefts in center" → centerRole=lark, centerHand=left
      const heyRole = parseLeadingRole(text);
      if (heyRole) overrides.centerRole = heyRole;
      if (/\blefts?\s+in\s+(?:the\s+)?(?:center|centre|middle)/i.test(text))
        overrides.centerHand = "left";
      if (/\brights?\s+in\s+(?:the\s+)?(?:center|centre|middle)/i.test(text))
        overrides.centerHand = "right";
      break;
    }

    case "step":
      // "dance forward" / "dance backward" / "step back"
      if (/\bback(?:ward)?s?\b/i.test(text)) {
        overrides.direction = { type: "PureDirection", dir: "behind" };
      } else if (/\bforward\b/i.test(text)) {
        overrides.direction = { type: "PureDirection", dir: "in_front" };
      }
      // Parse distance like "0.5m" or "1 meter"
      {
        const distMatch = text.match(/([\d.]+)\s*m(?:eters?)?\b/i);
        if (distMatch) overrides.distance = Number(distMatch[1]);
      }
      break;

    case "long_line_in_center": {
      const role = parseRoleMention(text);
      if (role) overrides.role = role;
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

  if (Object.keys(overrides).length === 0) return instr;

  return InstructionSchema.parse({ ...instr, ...overrides });
}

/** Look for a role mentioned in the text (not at the start). */
function parseRoleMention(text: string): Role | null {
  if (/\blarks?\b|\bgentlespoons?\b/i.test(text)) return "lark";
  if (/\brobins?\b|\bladles?\b/i.test(text)) return "robin";
  return null;
}
