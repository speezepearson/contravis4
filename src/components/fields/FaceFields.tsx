import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledDirectionSchema } from "../../instructions/_base";
import { type Instruction, InstructionSchema } from "../../instructions/index";
import { CalledDirectionDropdown } from "../CalledDirectionDropdown";
import type { SubFormProps } from "../fieldUtils";

export function FaceFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "face" }>;
}) {
  const { id } = instruction;

  function tryCommit(overrides: Record<string, unknown>) {
    const result = InstructionSchema.safeParse({
      id,
      type: "face",
      beats: instruction.beats,
      direction: instruction.direction,
      ...overrides,
    } satisfies Instruction);
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <CalledDirectionDropdown
        options={CalledDirectionSchema.options}
        value={instruction.direction}
        onChange={(f) => tryCommit({ direction: f })}
      />
    </>
  );
}
