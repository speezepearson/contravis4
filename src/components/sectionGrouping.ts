import type { Instruction } from "../instructions/index";
import { instructionDuration } from "../instructions/index";

export type SectionLabel = "A1" | "A2" | "B1" | "B2";

export const SECTIONS: readonly {
  label: SectionLabel;
  start: number;
  end: number;
}[] = [
  { label: "A1", start: 0, end: 16 },
  { label: "A2", start: 16, end: 32 },
  { label: "B1", start: 32, end: 48 },
  { label: "B2", start: 48, end: 64 },
];

export interface SectionedInstruction {
  instruction: Instruction;
  index: number;
  startBeat: number;
  spillsOver: boolean;
}

export interface Section {
  label: SectionLabel;
  items: SectionedInstruction[];
}

export function groupIntoSections(instrs: Instruction[]): Section[] {
  const sections: Section[] = SECTIONS.map((s) => ({
    label: s.label,
    items: [],
  }));

  let beat = 0;
  for (let i = 0; i < instrs.length; i++) {
    const instr = instrs[i];
    const duration = instructionDuration(instr);

    // Find which section this instruction's start beat falls into
    let sectionIdx = SECTIONS.findIndex(
      (s, si) =>
        beat >= s.start &&
        (si === SECTIONS.length - 1 ? beat <= s.end : beat < s.end),
    );
    if (sectionIdx === -1) {
      // Beyond 64 beats — append to B2
      sectionIdx = SECTIONS.length - 1;
    }

    const sectionEnd = SECTIONS[sectionIdx].end;
    const spillsOver =
      sectionIdx < SECTIONS.length - 1 && beat + duration > sectionEnd;

    sections[sectionIdx].items.push({
      instruction: instr,
      index: i,
      startBeat: beat,
      spillsOver,
    });

    beat += duration;
  }

  return sections;
}

export function spillTargetLabel(
  startBeat: number,
  duration: number,
): SectionLabel {
  const endBeat = startBeat + duration;
  const target = SECTIONS.find((s) => endBeat <= s.end);
  return target?.label ?? "B2";
}
