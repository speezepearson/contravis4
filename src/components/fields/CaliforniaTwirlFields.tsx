import type { AtomicInstruction } from "../../instructions/_atomic";
import { InstructionSchema } from "../../instructions/index";
import type { SubFormProps } from "../fieldUtils";
import { FULL_FOIL_RELATIONSHIP_OPTIONS } from "../fieldUtils";
import { RelationshipDropdown } from "../RelationshipDropdown";

export function CaliforniaTwirlFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "california_twirl" }>;
}) {
  const { id } = instruction;

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      type: "california_twirl",
      beats: instruction.beats,
      relationship: instruction.relationship,
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      {"with your "}
      <RelationshipDropdown
        options={FULL_FOIL_RELATIONSHIP_OPTIONS}
        value={instruction.relationship}
        onChange={(rel) => tryCommit({ relationship: rel })}
      />
    </>
  );
}
