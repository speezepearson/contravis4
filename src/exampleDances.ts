import { type Dance, DanceSchema } from "./instructions/index";

type DanceModule = { default: unknown };

const modules = import.meta.glob<DanceModule>(
  "../example-dances/*.dance.json",
  { eager: true },
);

export interface ExampleDance {
  filename: string;
  name: string;
  dance: Dance;
}

export const exampleDances: ExampleDance[] = Object.entries(modules).map(
  ([path, mod]) => {
    const filename = path.split("/").pop() ?? path;
    const dance = DanceSchema.parse(mod.default);
    return { filename, name: dance.name ?? filename, dance };
  },
);

export function sortedExampleDances(isDevMode: boolean): ExampleDance[] {
  const isDummy = (d: ExampleDance) => d.filename.endsWith(".dummy.dance.json");
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
