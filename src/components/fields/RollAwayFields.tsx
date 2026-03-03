import { RoleSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { InstructionSchema } from "../../instructions/index";
import { RolleeSpecSchema } from "../../instructions/rollAway";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
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

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      type: "roll_away",
      beats: instruction.beats,
      roller: instruction.roller,
      rollee: instruction.rollee,
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
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
      {" roll away your "}
      <CalledIdentifierDropdown
        options={[...RolleeSpecSchema.options]}
        value={instruction.rollee}
        onChange={(v) => tryCommit({ rollee: v })}
      />
    </>
  );
}
