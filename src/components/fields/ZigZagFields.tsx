import type z from "zod";

import { HandSchema, otherHand } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { ZigZagInstructionSchema } from "../../instructions/zigZag";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

const NZIGS_OPTIONS = ["1", "2", "3"] as const;
const safeStringNZigs = { 1: "1", 2: "2", 3: "3" } as const;

export function ZigZagFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "zig_zag" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof ZigZagInstructionSchema>>,
  ) {
    const result = typedSafeParse(ZigZagInstructionSchema, {
      id,
      type: "zig_zag",
      beats: instruction.beats,
      dir: instruction.dir,
      nZigs: instruction.nZigs,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      {": zig "}
      <InlineDropdown
        options={HAND_OPTIONS}
        value={instruction.dir}
        onChange={(v) => tryCommit({ dir: HandSchema.parse(v) })}
      />{" "}
      <InlineDropdown<(typeof NZIGS_OPTIONS)[number]>
        options={NZIGS_OPTIONS}
        getLabel={(v) => {
          switch (v) {
            case "1":
              return `zag ${otherHand(instruction.dir)}`;
            case "2":
              return `zag ${otherHand(instruction.dir)} zig ${instruction.dir}`;
            case "3":
              return `zag ${otherHand(instruction.dir)} zig ${instruction.dir} zag ${otherHand(instruction.dir)}`;
          }
        }}
        value={safeStringNZigs[instruction.nZigs]}
        onChange={(v) =>
          tryCommit({
            nZigs: ZigZagInstructionSchema.shape.nZigs.parse(Number(v)),
          })
        }
      />
    </>
  );
}
