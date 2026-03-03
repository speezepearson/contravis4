import { RoleSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { InstructionSchema } from "../../instructions/index";
import type { SubFormProps } from "../fieldUtils";
import { ROLE_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

const DIR_OPTIONS = ["rtl", "ltr"];
const DIR_LABELS: Record<string, string> = {
  rtl: "right to left",
  ltr: "left to right",
};

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
      dir: instruction.dir,
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <InlineDropdown
        options={ROLE_OPTIONS}
        value={instruction.roller}
        onChange={(v) => tryCommit({ roller: RoleSchema.parse(v) })}
        getLabel={(v) => v + "s"}
      />
      {" roll away "}
      <InlineDropdown
        options={DIR_OPTIONS}
        value={instruction.dir}
        onChange={(v) => tryCommit({ dir: v })}
        getLabel={(v) => DIR_LABELS[v] ?? v}
      />
    </>
  );
}
