import { describe, expect, it } from "vitest";

import { labelId } from "../identifiers";
import type { Instruction } from "../instructions/index";
import { makeInstructionId } from "./fieldUtils";
import { groupIntoSections, spillTargetLabel } from "./sectionGrouping";

function makeBalance(beats: number): Instruction {
  return {
    type: "balance",
    id: makeInstructionId(),
    beats,
    cid: labelId("partner"),
  };
}

describe("groupIntoSections", () => {
  it("places four 16-beat instructions into A1, A2, B1, B2", () => {
    const instrs = [
      makeBalance(16),
      makeBalance(16),
      makeBalance(16),
      makeBalance(16),
    ];
    const sections = groupIntoSections(instrs);

    expect(sections.map((s) => s.label)).toEqual(["A1", "A2", "B1", "B2"]);
    expect(sections[0].items).toHaveLength(1);
    expect(sections[1].items).toHaveLength(1);
    expect(sections[2].items).toHaveLength(1);
    expect(sections[3].items).toHaveLength(1);

    expect(sections[0].items[0].startBeat).toBe(0);
    expect(sections[1].items[0].startBeat).toBe(16);
    expect(sections[2].items[0].startBeat).toBe(32);
    expect(sections[3].items[0].startBeat).toBe(48);
  });

  it("places multiple instructions within a section", () => {
    const instrs = [makeBalance(4), makeBalance(4), makeBalance(8)];
    const sections = groupIntoSections(instrs);

    expect(sections[0].items).toHaveLength(3);
    expect(sections[0].items[0].startBeat).toBe(0);
    expect(sections[0].items[1].startBeat).toBe(4);
    expect(sections[0].items[2].startBeat).toBe(8);
    expect(sections[1].items).toHaveLength(0);
  });

  it("marks spillover when an instruction crosses a section boundary", () => {
    const instrs = [makeBalance(12), makeBalance(8)];
    const sections = groupIntoSections(instrs);

    expect(sections[0].items).toHaveLength(2);
    expect(sections[0].items[0].spillsOver).toBe(false);
    // 8-beat instruction starting at beat 12 ends at beat 20, spilling into A2
    expect(sections[0].items[1].spillsOver).toBe(true);
  });

  it("does not mark spillover for an instruction that exactly fills a section", () => {
    const instrs = [makeBalance(8), makeBalance(8)];
    const sections = groupIntoSections(instrs);

    expect(sections[0].items).toHaveLength(2);
    expect(sections[0].items[0].spillsOver).toBe(false);
    expect(sections[0].items[1].spillsOver).toBe(false);
  });

  it("does not mark spillover in the last section (B2)", () => {
    const instrs = [makeBalance(48), makeBalance(20)];
    const sections = groupIntoSections(instrs);

    expect(sections[3].items).toHaveLength(1);
    expect(sections[3].items[0].startBeat).toBe(48);
    // Even though 48+20=68 > 64, B2 is the last section so no spillover
    expect(sections[3].items[0].spillsOver).toBe(false);
  });

  it("assigns instructions beyond beat 64 to B2", () => {
    const instrs = [makeBalance(64), makeBalance(4)];
    const sections = groupIntoSections(instrs);

    // First instruction starts at beat 0, goes into A1
    expect(sections[0].items).toHaveLength(1);
    // Second instruction starts at beat 64, goes into B2
    expect(sections[3].items).toHaveLength(1);
    expect(sections[3].items[0].startBeat).toBe(64);
  });

  it("returns empty sections when no instructions exist", () => {
    const sections = groupIntoSections([]);
    expect(sections).toHaveLength(4);
    expect(sections.every((s) => s.items.length === 0)).toBe(true);
  });

  it("preserves original indices", () => {
    const instrs = [
      makeBalance(16),
      makeBalance(16),
      makeBalance(16),
      makeBalance(16),
    ];
    const sections = groupIntoSections(instrs);

    expect(sections[0].items[0].index).toBe(0);
    expect(sections[1].items[0].index).toBe(1);
    expect(sections[2].items[0].index).toBe(2);
    expect(sections[3].items[0].index).toBe(3);
  });

  it("handles instruction starting at exactly beat 16 (section boundary)", () => {
    const instrs = [makeBalance(16), makeBalance(4)];
    const sections = groupIntoSections(instrs);

    expect(sections[0].items).toHaveLength(1);
    expect(sections[1].items).toHaveLength(1);
    expect(sections[1].items[0].startBeat).toBe(16);
  });
});

describe("spillTargetLabel", () => {
  it("returns A2 for an instruction spilling from A1", () => {
    expect(spillTargetLabel(12, 8)).toBe("A2");
  });

  it("returns B1 for an instruction spilling from A2", () => {
    expect(spillTargetLabel(28, 8)).toBe("B1");
  });

  it("returns B2 for an instruction spilling from B1", () => {
    expect(spillTargetLabel(44, 8)).toBe("B2");
  });

  it("returns B2 for an instruction that spills past the entire dance", () => {
    expect(spillTargetLabel(12, 100)).toBe("B2");
  });
});
