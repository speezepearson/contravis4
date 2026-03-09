import type { Dance, Instruction } from "./instructions/index";

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

function countInstructionTypes(
  instructions: Instruction[],
  counts: Map<Instruction["type"], number>,
): void {
  for (const instr of instructions) {
    counts.set(instr.type, (counts.get(instr.type) ?? 0) + 1);
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
export const contradbInstructionFrequencies: Map<Instruction["type"], number> =
  (() => {
    const counts = new Map<Instruction["type"], number>();
    for (const { dance } of exampleDances) {
      if (!dance.url?.includes("contradb.com")) continue;
      countInstructionTypes(dance.instructions, counts);
    }
    return counts;
  })();

export function sortedExampleDances(isDevMode: boolean): ExampleDance[] {
  const isDummy = (d: ExampleDance) => d.dance.status === "dummy";
  const filtered = isDevMode
    ? exampleDances
    : exampleDances.filter((d) => !isDummy(d));
  return [...filtered].sort((a, b) => {
    const aDummy = isDummy(a);
    const bDummy = isDummy(b);
    if (aDummy !== bDummy) return aDummy ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
