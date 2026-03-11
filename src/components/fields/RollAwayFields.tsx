import type z from "zod";

import { RoleSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { labelId, personInDir } from "../../instructions/_base";
import {
  RollAwayInstructionSchema,
  RolleeSpecSchema,
} from "../../instructions/rollAway";
import { IrreducibleLabelSchema } from "../../labels";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
import type { SubFormProps } from "../fieldUtils";
import { ROLE_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function RollAwayFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "roll_away" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof RollAwayInstructionSchema>>,
  ) {
    const result = typedSafeParse(RollAwayInstructionSchema, {
      id,
      type: "roll_away",
      beats: instruction.beats,
      roller: instruction.roller,
      rollee: instruction.rollee,
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
        value={instruction.roller}
        onChange={(v) => tryCommit({ roller: RoleSchema.parse(v) })}
        getLabel={(v) => v + "s"}
      />
      {" roll away "}
      <CalledIdentifierEditor
        baseOptions={[
          personInDir("on_right", "different"),
          personInDir("on_left", "different"),
          ...IrreducibleLabelSchema.options.map((l) => labelId(l)),
        ]}
        value={instruction.rollee}
        onChange={(v) => tryCommit({ rollee: RolleeSpecSchema.parse(v) })}
      />
    </>
  );
}
