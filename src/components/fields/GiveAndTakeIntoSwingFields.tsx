import type z from "zod";

import { RoleSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import {
  CalledIdentifierSchema,
  inferRoleOfCalledIdentifier,
} from "../../instructions/_base";
import { GiveAndTakeIntoSwingInstructionSchema } from "../../instructions/giveAndTakeIntoSwing";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import { CardinalDirectionDropdown } from "../CardinalDirectionDropdown";
import type { SubFormProps } from "../fieldUtils";
import { ROLE_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function GiveAndTakeIntoSwingFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "give_and_take_into_swing" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof GiveAndTakeIntoSwingInstructionSchema>>,
  ) {
    const result = typedSafeParse(GiveAndTakeIntoSwingInstructionSchema, {
      id,
      type: "give_and_take_into_swing",
      beats: instruction.beats,
      cid: instruction.cid,
      drawerRole: instruction.drawerRole,
      endFacing: instruction.endFacing,
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
        value={instruction.drawerRole}
        onChange={(v) => tryCommit({ drawerRole: RoleSchema.parse(v) })}
        getLabel={(v) => v + "s"}
      />
      {" draw "}
      <CalledIdentifierDropdown
        options={CalledIdentifierSchema.options.filter(
          (cid) => inferRoleOfCalledIdentifier(cid) !== "same",
        )}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
      {" across and swing, end facing "}
      <CardinalDirectionDropdown
        value={instruction.endFacing}
        onChange={(f) => tryCommit({ endFacing: f })}
        onInvalid={onInvalid}
      />
    </>
  );
}
