import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import {
  ALL_BASE_CALLED_IDENTIFIERS,
  inferRoleOfCalledIdentifier,
} from "../../instructions/_base";
import { SwingInstructionSchema } from "../../instructions/swing";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
import { CardinalDirectionDropdown } from "../CardinalDirectionDropdown";
import type { SubFormProps } from "../fieldUtils";

export function SwingFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "swing" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof SwingInstructionSchema>>,
  ) {
    const result = typedSafeParse(SwingInstructionSchema, {
      id,
      type: "swing",
      beats: instruction.beats,
      cid: instruction.cid,
      endFacing: instruction.endFacing,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <CalledIdentifierEditor
        baseOptions={ALL_BASE_CALLED_IDENTIFIERS.filter(
          (cid) => inferRoleOfCalledIdentifier(cid) !== "same",
        )}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
      {", end facing "}
      <CardinalDirectionDropdown
        value={instruction.endFacing}
        onChange={(f) => tryCommit({ endFacing: f })}
        onInvalid={onInvalid}
      />
    </>
  );
}
