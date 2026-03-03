import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { InstructionSchema } from "../../instructions/index";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";

export function BoxTheGnatFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "box_the_gnat" }>;
}) {
  const { id } = instruction;

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      type: "box_the_gnat",
      beats: instruction.beats,
      cid: instruction.cid,
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      {"with "}
      <CalledIdentifierDropdown
        options={CalledIdentifierSchema.options} // TODO: exclude same-role dancers
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
