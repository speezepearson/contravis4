import type {
  ActionOptionType,
  Dance,
  Instruction,
} from "./instructions/index";

type DanceModule = { default: Dance };

const modules = import.meta.glob<DanceModule>("./example-dances/*.ts", {
  eager: true,
});

export interface ExampleDance {
  filename: string;
  name: string;
  dance: Dance;
}

export const exampleDances: ExampleDance[] = Object.entries(modules).map(
  ([path, mod]) => {
    const filename = path.split("/").pop() ?? path;
    const dance = mod.default;
    return { filename, name: dance.name ?? filename, dance };
  },
);

function actionOptionType(instr: Instruction): ActionOptionType {
  if (instr.type === "templated_lr") return instr.templateId;
  if (instr.type === "templated_llrr") return instr.templateId;
  return instr.type;
}

function countInstructionTypes(
  instructions: Instruction[],
  counts: Map<ActionOptionType, number>,
): void {
  for (const instr of instructions) {
    const key = actionOptionType(instr);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (instr.type === "split") {
      const sublists =
        instr.by === "role"
          ? [instr.larks, instr.robins]
          : [instr.ups, instr.downs];
      for (const sublist of sublists) {
        countInstructionTypes(sublist, counts);
      }
    }
  }
}

/** Frequency of each instruction type across example dances with contradb URLs. */
export const contradbInstructionFrequencies: Map<ActionOptionType, number> =
  (() => {
    const counts = new Map<ActionOptionType, number>();
    for (const { dance } of exampleDances) {
      if (!dance.url?.includes("contradb.com")) continue;
      countInstructionTypes(dance.instructions, counts);
    }
    return counts;
  })();

export function isDanceVerified(d: Dance): boolean {
  return d.status === "verified";
}

export function sortedExampleDances(isDevMode: boolean): ExampleDance[] {
  const isDummy = (d: ExampleDance) => d.dance.status === "dummy";
  const filtered = isDevMode
    ? exampleDances
    : exampleDances.filter((d) => isDanceVerified(d.dance));
  return [...filtered].sort((a, b) => {
    const aDummy = isDummy(a);
    const bDummy = isDummy(b);
    if (aDummy !== bDummy) return aDummy ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
