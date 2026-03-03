import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { InstructionSchema } from "../../instructions/index";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
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

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      type: "swing",
      beats: instruction.beats,
      cid: instruction.cid,
      endFacing: instruction.endFacing,
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <CalledIdentifierDropdown
        options={CalledIdentifierSchema.options} // TODO: exclude same-role dancers
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
      {" \u2192 "}
      <CardinalDirectionDropdown
        value={instruction.endFacing}
        onChange={(f) => tryCommit({ endFacing: f })}
        onInvalid={onInvalid}
      />
    </>
  );
}
