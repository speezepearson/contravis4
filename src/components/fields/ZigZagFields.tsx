import type z from "zod";

import { HandSchema, RoleSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { ZigZagInstructionSchema } from "../../instructions/zigZag";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS, ROLE_OPTIONS } from "../fieldUtils";
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
      leader: instruction.leader,
      leaderDir: instruction.leaderDir,
      nZigs: instruction.nZigs,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      {": "}
      <InlineDropdown
        options={ROLE_OPTIONS}
        value={instruction.leader}
        onChange={(v) => tryCommit({ leader: RoleSchema.parse(v) })}
        getLabel={(v) => v + "s"}
      />
      {" lead out and go "}
      <InlineDropdown
        options={HAND_OPTIONS}
        value={instruction.leaderDir}
        onChange={(v) => tryCommit({ leaderDir: HandSchema.parse(v) })}
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
        onChange={(v) =>
          tryCommit({
            nZigs: ZigZagInstructionSchema.shape.nZigs.parse(Number(v)),
          })
        }
      />
    </>
  );
}
