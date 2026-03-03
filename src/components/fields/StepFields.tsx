import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { InstructionSchema } from "../../instructions/index";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";
import { InlineNumber } from "../InlineNumber";

export function StepFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "step" }>;
}) {
  const { id } = instruction;

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      type: "step",
      beats: instruction.beats,
      direction: instruction.direction,
      distance: instruction.distance,
      facing: instruction.facing,
      facingOffset: instruction.facingOffset,
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <CalledIdentifierDropdown
        options={CalledIdentifierSchema.options}
        value={instruction.direction}
        onChange={(dir) => tryCommit({ direction: dir })}
      />{" "}
      <InlineNumber
        value={String(instruction.distance)}
        onTextChange={(v) => tryCommit({ distance: Number(v) })}
        onDrag={(n) => tryCommit({ distance: n })}
        step={0.05}
        suffix="m"
      />
      {" and face "}
      <CalledIdentifierDropdown
        options={CalledIdentifierSchema.options}
        value={instruction.facing}
        onChange={(f) => tryCommit({ facing: f })}
      />
    </>
  );
}
