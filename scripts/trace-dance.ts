/**
 * Trace dancer state through each instruction in a dance file.
 *
 * Usage: npx tsx scripts/trace-dance.ts <dance.ts>
 *
 * Prints the dancer positions, facings, and hands at each instruction boundary.
 * On error, prints the error and the state at the point of failure, then continues.
 */

import { parseArgs } from "node:util";

import { enableMapSet } from "immer";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../src/contraCore";
import { generateDanceAnimation } from "../src/generate";
import { makeAtomicInstructionSegments } from "../src/instructions/_atomic";
import { animateSegments } from "../src/instructions/_segment";
import type { Instruction } from "../src/instructions/index";
import {
  instructionDuration,
  resolveInitFormation,
} from "../src/instructions/index";
import { robinsChainAnimator } from "../src/instructions/robinsChain";
import { splitAnimator } from "../src/instructions/split";
import { swingAnimator } from "../src/instructions/swing";
import type { WorldState } from "../src/worldState";
import { loadDance } from "./lib";

enableMapSet();

const { positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
});

const file = positionals[0];
if (!file) {
  console.error("Usage: npx tsx scripts/trace-dance.ts <dance.ts>");
  process.exit(1);
}

const dance = await loadDance(file);

const initState = resolveInitFormation(dance.initFormation);

function printState(state: WorldState): void {
  for (const id of ALL_PROTO_IDS) {
    const d = state[id];
    const angle = Math.round(
      (Math.atan2(d.facing.y, d.facing.x) * 180) / Math.PI,
    );
    const handStrs: string[] = [];
    if (d.hands.left)
      handStrs.push(`L->${d.hands.left.theirId}:${d.hands.left.theirHand}`);
    if (d.hands.right)
      handStrs.push(`R->${d.hands.right.theirId}:${d.hands.right.theirHand}`);
    const handsStr = handStrs.length > 0 ? `  ${handStrs.join(" ")}` : "";
    console.log(
      `    ${id.padEnd(14)} pos=(${d.pos.x.toFixed(2)}, ${d.pos.y.toFixed(2)})  facing=${String(angle).padStart(4)}°${handsStr}`,
    );
  }
}

function animateInstruction(
  init: WorldState,
  instr: Instruction,
): { dur: number; getFrame: (t: number) => WorldState } {
  if (instr.type === "split") {
    return splitAnimator(instr, init, ALL_PROTO_IDS_SET);
  }
  if (instr.type === "swing") {
    return swingAnimator(instr, init, ALL_PROTO_IDS_SET);
  }
  if (instr.type === "robins_chain") {
    return robinsChainAnimator(instr, init, ALL_PROTO_IDS_SET);
  }
  const segments = makeAtomicInstructionSegments(
    instr,
    init,
    ALL_PROTO_IDS_SET,
  );
  return animateSegments(init, ALL_PROTO_IDS_SET, segments);
}

// --- Trace: step through each instruction ---
let state = initState;
let beat = 0;

console.log(`\nDance: ${dance.name ?? "(unnamed)"}`);
console.log(
  `Formation: ${typeof dance.initFormation === "string" ? dance.initFormation : "custom"}`,
);
console.log(`Instructions: ${dance.instructions.length}`);
console.log();

console.log(`--- Initial state (beat 0) ---`);
printState(state);

for (const [i, instr] of dance.instructions.entries()) {
  const dur = instructionDuration(instr);
  const beatRange = dur === 0 ? `beat ${beat}` : `beats ${beat}-${beat + dur}`;
  console.log(
    `\n--- #${i}: ${instr.type} (${beatRange}, id=${instr.id.slice(0, 8)}) ---`,
  );

  try {
    const anim = animateInstruction(state, instr);
    state = anim.getFrame(anim.dur);
    printState(state);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`    ERROR: ${msg}`);
    console.log(`    State at failure:`);
    printState(state);
    console.log(
      `\n    (stopping trace — later instructions are meaningless after an error)`,
    );
    break;
  }

  beat += dur;
}

// --- Summary ---
console.log(`\n${"=".repeat(60)}`);
const result = generateDanceAnimation(dance.instructions, initState);
if (result.errors.length === 0) {
  console.log(`OK: Dance generates cleanly (${beat} beats).`);
} else {
  console.log(`ERRORS: ${result.errors.length} instruction(s) failed:`);
  for (const err of result.errors) {
    console.log(`  - ${err.instructionId.slice(0, 8)}: ${err.message}`);
  }
}
