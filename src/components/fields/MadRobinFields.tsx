import type z from "zod";

import { RoleSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { ALL_CALLED_IDENTIFIERS } from "../../instructions/_base";
import { MadRobinInstructionSchema } from "../../instructions/madRobin";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";
import { ROLE_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";
import { InlineNumber } from "../InlineNumber";

export function MadRobinFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "mad_robin" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof MadRobinInstructionSchema>>,
  ) {
    const result = typedSafeParse(MadRobinInstructionSchema, {
      id,
      type: "mad_robin",
      beats: instruction.beats,
      cid: instruction.cid,
      rotations: instruction.rotations,
      whoInFront: instruction.whoInFront,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <InlineNumber
        value={String(instruction.rotations)}
        onTextChange={(v) => tryCommit({ rotations: Number(v) })}
        onDrag={(n) => tryCommit({ rotations: n })}
        step={0.25}
        suffix="x"
      />
      {" with "}
      <CalledIdentifierDropdown
        options={ALL_CALLED_IDENTIFIERS}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
      {", "}
      <InlineDropdown
        options={ROLE_OPTIONS}
        value={instruction.whoInFront}
        onChange={(v) => tryCommit({ whoInFront: RoleSchema.parse(v) })}
        getLabel={(v) => v + "s"}
      />
      {" in front"}
    </>
  );
}
