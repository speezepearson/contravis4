import type z from "zod";

import { HandSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { ZigZagInstructionSchema } from "../../instructions/zigZag";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

const NZIGS_OPTIONS = ["1", "2", "3", "4"];

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
      {": go "}
      <InlineDropdown
        options={HAND_OPTIONS}
        value={instruction.dir}
        onChange={(v) => tryCommit({ dir: HandSchema.parse(v) })}
      />
      {", "}
      <InlineDropdown
        options={NZIGS_OPTIONS}
        getLabel={(v) => {
          switch (v) {
            case "1":
              return "zig";
            case "2":
              return "zig and zag";
            case "3":
              return "zig and zag and zig";
            case "4":
              return "zig and zag and zig and zag";
            default:
              return `${v} zigs`;
          }
        }}
        value={String(instruction.nZigs)}
        onChange={(v) => tryCommit({ nZigs: Number(v) as 1 | 2 | 3 | 4 })}
      />
    </>
  );
}
