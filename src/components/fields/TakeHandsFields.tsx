import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
import { InstructionSchema } from "../../instructions/index";
import { TakeHandSchema } from "../../instructions/takeHands";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";
import { TAKE_HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function TakeHandsFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "take_hands" }>;
}) {
  const { id } = instruction;

  function tryCommit(overrides: Record<string, unknown>) {
    const raw = {
      id,
      beats: 0,
      type: "take_hands",
      cid: instruction.cid,
      hand: instruction.hand,
      ...overrides,
    };
    const result = InstructionSchema.safeParse(raw);
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <InlineDropdown
        options={TAKE_HAND_OPTIONS}
        value={instruction.hand}
        onChange={(v) => tryCommit({ hand: TakeHandSchema.parse(v) })}
        getLabel={(v) => v}
      />
      {" with your "}
      <CalledIdentifierDropdown
        options={CalledIdentifierSchema.options}
        value={instruction.cid}
        onChange={(cid) => tryCommit({ cid })}
      />
    </>
  );
}
