import { RoleSchema } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { InstructionSchema } from "../../instructions/index";
import { CardinalDirectionDropdown } from "../CardinalDirectionDropdown";
import type { SubFormProps } from "../fieldUtils";
import { FULL_FOIL_RELATIONSHIP_OPTIONS, ROLE_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";
import { RelationshipDropdown } from "../RelationshipDropdown";

export function GiveAndTakeIntoSwingFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "give_and_take_into_swing" }>;
}) {
  const { id } = instruction;

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      type: "give_and_take_into_swing",
      beats: instruction.beats,
      relationship: instruction.relationship,
      role: instruction.drawerRole,
      endFacing: instruction.endFacing,
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
        value={instruction.drawerRole}
        onChange={(v) => tryCommit({ role: RoleSchema.parse(v) })}
        getLabel={(v) => v + "s"}
      />
      {" draw your "}
      <RelationshipDropdown
        options={FULL_FOIL_RELATIONSHIP_OPTIONS}
        value={instruction.relationship}
        onChange={(rel) => tryCommit({ relationship: rel })}
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
