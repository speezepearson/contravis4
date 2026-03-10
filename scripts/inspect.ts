import { parseArgs } from "node:util";

import { enableMapSet } from "immer";
import type { Vector } from "vecti";

import { ALL_PROTO_IDS, type DancerId, type Hand } from "../src/contraCore";
import { generateDanceAnimation } from "../src/generate";
import { EAST, NORTH, PI, SOUTH, WEST } from "../src/geometry";
import type { Instruction } from "../src/instructions/index";
import {
  instructionDuration,
  resolveInitFormation,
} from "../src/instructions/index";
import { Dancer, type WorldState } from "../src/worldState";
import { loadDance } from "./lib";

enableMapSet();

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    time: { type: "string", short: "t" },
  },
  allowPositionals: true,
  strict: true,
});

if (positionals.length !== 1 || values.time === undefined) {
  console.error("Usage: inspect.ts DANCE_PATH --time BEATS");
  process.exit(1);
}

const dancePath = positionals[0];
const time = Number(values.time);
if (!Number.isFinite(time) || time < 0) {
  console.error(`Invalid time: ${values.time}`);
  process.exit(1);
}

const dance = await loadDance(dancePath);

const { animation, errors } = generateDanceAnimation(
  dance.instructions,
  resolveInitFormation(dance.initFormation),
);

for (const error of errors) {
  console.error(
    `Generation error at instruction ${error.instructionId}: ${error.message}`,
  );
}

if (!animation) {
  console.error("No animation produced.");
  process.exit(1);
}

if (time > animation.dur) {
  console.error(
    `Time ${time} exceeds animation duration (${animation.dur} beats).`,
  );
  process.exit(1);
}

const activeInstr = findActiveInstruction(dance.instructions, time);
const initState = animation.getFrame(activeInstr.startBeat);
const state = animation.getFrame(time);
console.log(formatActiveInstruction(activeInstr));
console.log(formatWorldState(initState, "init", activeInstr.startBeat));
console.log();
console.log(formatWorldState(state, "current", time));

// --- instruction lookup ---

type ActiveInstruction = {
  index: number;
  instruction: Instruction;
  startBeat: number;
  endBeat: number;
};

function findActiveInstruction(
  instructions: Instruction[],
  t: number,
): ActiveInstruction {
  let beat = 0;
  for (let i = 0; i < instructions.length; i++) {
    const dur = instructionDuration(instructions[i]);
    // For 0-beat instructions, match if t lands exactly on their beat.
    // For timed instructions, match if t falls within [start, start+dur).
    // Always match the last instruction as a fallback.
    if (
      (dur === 0 && t === beat) ||
      (dur > 0 && t < beat + dur) ||
      i === instructions.length - 1
    ) {
      return {
        index: i,
        instruction: instructions[i],
        startBeat: beat,
        endBeat: beat + dur,
      };
    }
    beat += dur;
  }
  // unreachable given the i === length - 1 fallback above
  throw new Error("No instructions");
}

function formatActiveInstruction(active: ActiveInstruction): string {
  const { index, instruction, startBeat, endBeat } = active;
  const type =
    instruction.type === "split"
      ? `split by ${instruction.by}`
      : instruction.type;
  return `Instruction #${index}: ${type} (beats ${startBeat}–${endBeat}, id ${instruction.id})`;
}

// --- formatting helpers ---

function formatWorldState(ws: WorldState, label: string, t: number): string {
  const lines = [`${label} state (t=${t}):`];
  for (const id of ALL_PROTO_IDS) {
    lines.push(formatDancer(Dancer.get(id, ws)));
  }
  return lines.join("\n");
}

function formatDancer(d: Dancer): string {
  const pos = formatPos(d.pos);
  const facing = formatFacing(d.facing);
  const hands = formatHands(d.hands);
  return `  ${d.protoId.padEnd(14)}  pos=${pos}  facing=${facing}  ${hands}`;
}

function formatPos(v: Vector): string {
  const fmt = (n: number) => (n >= 0 ? " " : "") + n.toFixed(2);
  return `(${fmt(v.x)}, ${fmt(v.y)})`;
}

function formatFacing(v: Vector): string {
  const cardinals: [Vector, string][] = [
    [NORTH, "N"],
    [SOUTH, "S"],
    [EAST, "E"],
    [WEST, "W"],
  ];
  for (const [ref, label] of cardinals) {
    if (Math.abs(v.x - ref.x) < 1e-6 && Math.abs(v.y - ref.y) < 1e-6) {
      return label;
    }
  }
  const deg = (Math.atan2(v.y, v.x) * 180) / PI;
  return `${deg.toFixed(0)}°`;
}

function formatHands(
  hands: Partial<Record<Hand, { theirId: DancerId; theirHand: Hand }>>,
): string {
  const parts: string[] = [];
  for (const hand of ["left", "right"] as const) {
    const held = hands[hand];
    if (!held) continue;
    const h = hand === "left" ? "L" : "R";
    const th = held.theirHand === "left" ? "L" : "R";
    parts.push(`${h}->${held.theirId}'s ${th}`);
  }
  return parts.length > 0 ? `hands: ${parts.join(", ")}` : "";
}
