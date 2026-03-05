import type z from "zod";

import { HandSchema, RoleSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { PoussetteInstructionSchema } from "../../instructions/poussette";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS, ROLE_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function PoussetteFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "poussette" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof PoussetteInstructionSchema>>,
  ) {
    const result = typedSafeParse(PoussetteInstructionSchema, {
      id,
      type: "poussette",
      beats: instruction.beats,
      backer: instruction.backer,
      backerDir: instruction.backerDir,
      full: instruction.full,
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
        value={instruction.backer}
        onChange={(v) => tryCommit({ backer: RoleSchema.parse(v) })}
        getLabel={(v) => v + "s"}
      />
      {" back to the "}
      <InlineDropdown
        options={HAND_OPTIONS}
        value={instruction.backerDir}
        onChange={(v) => tryCommit({ backerDir: HandSchema.parse(v) })}
      />
      {", "}
      <InlineDropdown
        options={["half", "full"]}
        value={instruction.full ? "full" : "half"}
        onChange={(v) => tryCommit({ full: v === "full" })}
      />
    </>
  );
}
