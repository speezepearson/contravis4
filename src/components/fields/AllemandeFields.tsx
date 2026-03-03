import type z from "zod";

import { HandSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { AllemandeInstructionSchema } from "../../instructions/allemande";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";
import { InlineNumber } from "../InlineNumber";

export function AllemandeFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "allemande" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof AllemandeInstructionSchema>>,
  ) {
    const result = typedSafeParse(AllemandeInstructionSchema, {
      id,
      type: "allemande",
      beats: instruction.beats,
      cid: instruction.cid,
      handedness: instruction.handedness,
      rotations: instruction.rotations,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <InlineDropdown
        options={HAND_OPTIONS}
        value={instruction.handedness}
        onChange={(v) => tryCommit({ handedness: HandSchema.parse(v) })}
        getLabel={(v) => v}
      />{" "}
      <InlineNumber
        value={String(instruction.rotations)}
        onTextChange={(v) => tryCommit({ rotations: Number(v) })}
        onDrag={(n) => tryCommit({ rotations: n })}
        step={0.25}
        suffix="x"
      />
      {" with "}
      <CalledIdentifierDropdown
        options={CalledIdentifierSchema.options}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
