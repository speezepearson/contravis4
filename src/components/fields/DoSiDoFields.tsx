import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { ALL_CALLED_IDENTIFIERS } from "../../instructions/_base";
import { DoSiDoInstructionSchema } from "../../instructions/doSiDo";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";
import { InlineNumber } from "../InlineNumber";

export function DoSiDoFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "do_si_do" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof DoSiDoInstructionSchema>>,
  ) {
    const result = typedSafeParse(DoSiDoInstructionSchema, {
      id,
      type: "do_si_do",
      beats: instruction.beats,
      cid: instruction.cid,
      rotations: instruction.rotations,
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
    </>
  );
}
