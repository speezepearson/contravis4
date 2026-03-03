import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { InstructionSchema } from "../../instructions/index";
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

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      type: "do_si_do",
      beats: instruction.beats,
      cid: instruction.cid,
      rotations: instruction.rotations,
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
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
        options={CalledIdentifierSchema.options}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
