import { execFileSync, type ExecFileSyncOptions } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { enableMapSet } from "immer";

import { generateDanceAnimation } from "../src/generate";
import {
  type Dance,
  danceLength,
  DanceSchema,
  type Instruction,
  instructionDuration,
  resolveInitFormation,
} from "../src/instructions/index";

enableMapSet();

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

type OutputFormat = "txt" | "json";

const { positionals, values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    output: { type: "string", default: "txt" },
  },
  allowPositionals: true,
  strict: true,
});

if (positionals.length !== 1) {
  console.error("Usage: verify-noop.ts [--output=txt|json] COMMIT");
  process.exit(1);
}

const commit = positionals[0];
const outputFormat: OutputFormat = (() => {
  const v = values.output ?? "txt";
  if (v !== "txt" && v !== "json") {
    console.error(`Invalid --output value: ${v} (expected "txt" or "json")`);
    process.exit(1);
  }
  return v;
})();

/** Log progress. In json mode, goes to stderr so stdout stays pure JSON. */
function log(msg: string): void {
  if (outputFormat === "json") {
    process.stderr.write(msg + "\n");
  } else {
    console.log(msg);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FrameData = { t: number; state: unknown };
type DanceOk = { frames: FrameData[] };
type DanceErr = { error: string };
type DanceResult = DanceOk | DanceErr;
type AllResults = Record<string, DanceResult>;

function isOk(r: DanceResult): r is DanceOk {
  return "frames" in r;
}

type InstructionInfo = {
  instr: Instruction;
  index: number;
  startBeat: number;
  endBeat: number;
};

type DiffDetail = {
  t: number;
  instruction: InstructionInfo | null;
  initState: unknown;
  current: unknown;
  worktree: unknown;
};

type DanceComparisonPass = { status: "pass" };
type DanceComparisonFrameFail = {
  status: "fail";
  totalFrames: number;
  differingFrames: number;
  firstDiff: DiffDetail;
};
type DanceComparisonErrorFail = { status: "fail"; message: string };
type DanceComparison =
  | DanceComparisonPass
  | DanceComparisonFrameFail
  | DanceComparisonErrorFail;

// ---------------------------------------------------------------------------
// Instruction lookup
// ---------------------------------------------------------------------------

function findActiveInstruction(
  instructions: Instruction[],
  t: number,
): InstructionInfo {
  let beat = 0;
  for (let i = 0; i < instructions.length; i++) {
    const dur = instructionDuration(instructions[i]);
    if (
      (dur === 0 && t === beat) ||
      (dur > 0 && t < beat + dur) ||
      i === instructions.length - 1
    ) {
      const instr = instructions[i];
      return {
        instr,
        index: i,
        startBeat: beat,
        endBeat: beat + dur,
      };
    }
    beat += dur;
  }
  throw new Error("No instructions");
}

function findFrameNear(
  frames: FrameData[],
  targetT: number,
): unknown | undefined {
  let best: FrameData | undefined;
  let bestDist = Infinity;
  for (const f of frames) {
    const d = Math.abs(f.t - targetT);
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return bestDist < 0.01 ? best?.state : undefined;
}

// ---------------------------------------------------------------------------
// Discover dances
// ---------------------------------------------------------------------------

const danceDir = resolve("example-dances");
const dancePaths = readdirSync(danceDir)
  .filter((f) => f.endsWith(".dance.json"))
  .sort()
  .map((f) => join(danceDir, f));

if (dancePaths.length === 0) {
  console.error("No .dance.json files found in example-dances/");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Parsed dances (for instruction lookup during reporting)
// ---------------------------------------------------------------------------

const parsedDances = new Map<string, Dance>();

// ---------------------------------------------------------------------------
// Generate keyframes (current working tree, in-process)
// ---------------------------------------------------------------------------

function generateKeyframesInProcess(): AllResults {
  const results: AllResults = {};
  for (const path of dancePaths) {
    try {
      const raw = JSON.parse(readFileSync(path, "utf-8")) as unknown;
      const dance = DanceSchema.parse(raw);
      parsedDances.set(path, dance);
      const { animation, errors } = generateDanceAnimation(
        dance.instructions,
        resolveInitFormation(dance.initFormation),
      );
      if (!animation) {
        results[path] = {
          error:
            errors.map((e) => e.message).join("; ") || "no animation produced",
        };
        continue;
      }
      const dur = danceLength(dance.instructions);
      const count = Math.max(1, Math.round(dur * 4));
      const frames: FrameData[] = [];
      for (let i = 0; i <= count; i++) {
        const t = (dur * i) / count;
        frames.push({
          t,
          // Round-trip through JSON so we compare plain objects, not Vector instances.
          state: JSON.parse(JSON.stringify(animation.getFrame(t))) as unknown,
        });
      }
      results[path] = { frames };
    } catch (e) {
      results[path] = { error: String(e) };
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Generate keyframes (worktree, via subprocess)
// ---------------------------------------------------------------------------

function generateKeyframesFromWorktree(worktreeDir: string): AllResults {
  const scriptsDir = join(worktreeDir, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  copyFileSync(
    resolve("scripts/verify-noop-gen.ts"),
    join(scriptsDir, "verify-noop-gen.ts"),
  );

  const tsxBin = resolve("node_modules/.bin/tsx");
  const genScript = join(scriptsDir, "verify-noop-gen.ts");

  const opts: ExecFileSyncOptions = {
    encoding: "utf-8",
    maxBuffer: 100 * 1024 * 1024, // 100 MB
    stdio: ["pipe", "pipe", "pipe"],
  };

  let stdout: string;
  try {
    stdout = execFileSync(tsxBin, [genScript, ...dancePaths], opts) as string;
  } catch (e: unknown) {
    const stderr =
      e && typeof e === "object" && "stderr" in e ? String(e.stderr) : "";
    throw new Error(`Worktree generator failed:\n${stderr || String(e)}`);
  }

  return JSON.parse(stdout) as AllResults;
}

// ---------------------------------------------------------------------------
// Normalization & comparison
// ---------------------------------------------------------------------------

/** Round all numbers to 6 decimal places and sort object keys for deterministic comparison. */
function normalize(val: unknown): unknown {
  if (typeof val === "number") return Math.round(val * 1e6) / 1e6;
  if (Array.isArray(val)) return val.map(normalize);
  if (val !== null && typeof val === "object") {
    return Object.fromEntries(
      Object.keys(val)
        .sort()
        .map((k) => [k, normalize((val as Record<string, unknown>)[k])]),
    );
  }
  return val;
}

function compareDance(
  path: string,
  current: DanceResult,
  worktree: DanceResult,
): DanceComparison {
  if (!isOk(current) && !isOk(worktree)) {
    if (current.error === worktree.error) return { status: "pass" };
    return {
      status: "fail",
      message: `Different errors:\n    current:  ${current.error}\n    ${commit}: ${worktree.error}`,
    };
  }
  if (!isOk(current) || !isOk(worktree)) {
    const side = isOk(current) ? commit : "current";
    const errSide = isOk(current) ? worktree : current;
    return {
      status: "fail",
      message: `Only ${side} errored: ${(errSide as DanceErr).error}`,
    };
  }

  // Both succeeded — compare frame by frame.
  const totalFrames = Math.max(current.frames.length, worktree.frames.length);
  let differingFrames = 0;
  let firstDiff: DiffDetail | null = null;

  for (let i = 0; i < totalFrames; i++) {
    const cf = current.frames[i];
    const wf = worktree.frames[i];
    const cNorm = normalize(cf?.state);
    const wNorm = normalize(wf?.state);
    if (JSON.stringify(cNorm) !== JSON.stringify(wNorm)) {
      differingFrames++;
      if (!firstDiff) {
        const t = cf?.t ?? wf?.t ?? i;
        const dance = parsedDances.get(path);
        const instruction =
          dance && dance.instructions.length > 0
            ? findActiveInstruction(dance.instructions, t)
            : null;
        const initState = instruction
          ? normalize(findFrameNear(current.frames, instruction.startBeat))
          : undefined;
        firstDiff = {
          t,
          instruction,
          initState,
          current: cNorm,
          worktree: wNorm,
        };
      }
    }
  }

  if (differingFrames === 0) return { status: "pass" };
  return {
    status: "fail",
    totalFrames,
    differingFrames,
    firstDiff: firstDiff!,
  };
}

// ---------------------------------------------------------------------------
// Text formatting helpers
// ---------------------------------------------------------------------------

function formatFacing(f: { x: number; y: number }): string {
  const cardinals: [number, number, string][] = [
    [0, 1, "N"],
    [0, -1, "S"],
    [1, 0, "E"],
    [-1, 0, "W"],
  ];
  for (const [rx, ry, label] of cardinals) {
    if (Math.abs(f.x - rx) < 1e-4 && Math.abs(f.y - ry) < 1e-4) return label;
  }
  const deg = (Math.atan2(f.y, f.x) * 180) / Math.PI;
  return `${deg.toFixed(0)}°`;
}

function formatPos(p: { x: number; y: number }): string {
  const fmt = (n: number) => (n >= 0 ? " " : "") + n.toFixed(2);
  return `(${fmt(p.x)}, ${fmt(p.y)})`;
}

type PlainDancer = {
  pos?: { x: number; y: number };
  facing?: { x: number; y: number };
  [k: string]: unknown;
};

function formatInitState(state: unknown): string {
  if (!state || typeof state !== "object") return "    (unavailable)";
  const dancers = state as Record<string, PlainDancer>;
  const ids = Object.keys(dancers).sort();
  return ids
    .map((id) => {
      const d = dancers[id];
      const pos = d.pos ? formatPos(d.pos) : "?";
      const facing = d.facing ? formatFacing(d.facing) : "?";
      return `    ${id.padEnd(14)}  pos=${pos}  facing=${facing}`;
    })
    .join("\n");
}

function formatFieldDiff(diff: DiffDetail): string {
  const current = diff.current as Record<string, PlainDancer> | null;
  const worktree = diff.worktree as Record<string, PlainDancer> | null;
  if (!current || !worktree) {
    return [
      `    current:  ${JSON.stringify(diff.current)?.slice(0, 200)}`,
      `    ${commit}: ${JSON.stringify(diff.worktree)?.slice(0, 200)}`,
    ].join("\n");
  }

  for (const dancerId of Object.keys(current).sort()) {
    const cDancer = current[dancerId] as Record<string, unknown> | undefined;
    const wDancer = worktree[dancerId] as Record<string, unknown> | undefined;
    if (!cDancer || !wDancer) continue;
    for (const field of ["pos", "facing", "hands", "labels"]) {
      const cVal = JSON.stringify(cDancer[field]);
      const wVal = JSON.stringify(wDancer[field]);
      if (cVal !== wVal) {
        return [
          `    current.${dancerId}.${field} = ${cVal}`,
          `    ${commit}.${dancerId}.${field} = ${wVal}`,
        ].join("\n");
      }
    }
  }

  return [
    `    current:  ${JSON.stringify(diff.current)?.slice(0, 200)}`,
    `    ${commit}: ${JSON.stringify(diff.worktree)?.slice(0, 200)}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Output: text
// ---------------------------------------------------------------------------

type DanceReport = {
  filename: string;
  comparison: DanceComparison;
};

function outputTxt(reports: DanceReport[]): void {
  console.log();
  let failures = 0;
  for (const { filename, comparison } of reports) {
    if (comparison.status === "pass") {
      console.log(`${filename}: PASS`);
      continue;
    }
    failures++;
    if ("message" in comparison) {
      console.log(`${filename}: FAIL`);
      console.log(`  ${comparison.message}`);
      continue;
    }
    const { differingFrames, totalFrames, firstDiff } = comparison;
    console.log(
      `${filename}: FAIL (${differingFrames} of ${totalFrames} frames differ)`,
    );
    if (firstDiff.instruction) {
      const i = firstDiff.instruction;
      console.log(
        `  Instruction #${i.index}: ${i.instr.type} (beats ${i.startBeat}-${i.endBeat}, ${JSON.stringify(i.instr)})`,
      );
    }
    if (firstDiff.initState !== undefined) {
      console.log(
        `  Init state at t=${firstDiff.instruction?.startBeat ?? "?"}:`,
      );
      console.log(formatInitState(firstDiff.initState));
    }
    console.log(`  First difference at t=${firstDiff.t}:`);
    console.log(formatFieldDiff(firstDiff));
  }

  console.log();
  if (failures === 0) {
    console.log(`All ${reports.length} dances match.`);
  } else {
    console.log(`${failures} of ${reports.length} dances differ.`);
  }
}

// ---------------------------------------------------------------------------
// Output: JSON
// ---------------------------------------------------------------------------

function outputJson(reports: DanceReport[]): void {
  const results = reports.map(({ filename, comparison }) => {
    if (comparison.status === "pass") {
      return { filename, status: "pass" as const };
    }
    if ("message" in comparison) {
      return {
        filename,
        status: "fail" as const,
        message: comparison.message,
      };
    }
    return {
      filename,
      status: "fail" as const,
      totalFrames: comparison.totalFrames,
      differingFrames: comparison.differingFrames,
      firstDiff: comparison.firstDiff,
    };
  });

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  const output = {
    commit,
    results,
    summary: { total: results.length, passed, failed },
  };

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

log("Generating keyframes from current working tree...");
const currentResults = generateKeyframesInProcess();

log(`Creating worktree at ${commit}...`);
const worktreeDir = mkdtempSync(join(tmpdir(), "verify-noop-"));

let worktreeResults: AllResults;
try {
  execFileSync("git", ["worktree", "add", worktreeDir, commit], {
    stdio: "pipe",
  });

  symlinkSync(resolve("node_modules"), join(worktreeDir, "node_modules"));

  log("Generating keyframes from worktree...");
  worktreeResults = generateKeyframesFromWorktree(worktreeDir);
} finally {
  try {
    execFileSync("git", ["worktree", "remove", "--force", worktreeDir], {
      stdio: "pipe",
    });
  } catch {
    // SWALLOW_EXCEPTION: Best-effort cleanup; if the worktree was never
    // fully created the remove will fail, and that's fine.
    console.error(`Warning: failed to clean up worktree at ${worktreeDir}`);
  }
}

// Build reports
const reports: DanceReport[] = [];
for (const path of dancePaths) {
  const filename = basename(path);
  const current = currentResults[path];
  const worktree = worktreeResults[path];

  if (!current && !worktree) continue;

  let comparison: DanceComparison;
  if (!current) {
    comparison = { status: "fail", message: "missing from current results" };
  } else if (!worktree) {
    comparison = {
      status: "fail",
      message: `missing from ${commit} results`,
    };
  } else {
    comparison = compareDance(path, current, worktree);
  }
  reports.push({ filename, comparison });
}

if (outputFormat === "json") {
  outputJson(reports);
} else {
  outputTxt(reports);
}

const failures = reports.filter((r) => r.comparison.status === "fail").length;
process.exit(failures > 0 ? 1 : 0);
