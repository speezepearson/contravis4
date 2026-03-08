import type { Dance } from "./instructions/index";

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
